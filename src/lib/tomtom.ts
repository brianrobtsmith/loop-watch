import type { Route, TravelSample } from "./types.ts";

const TOMTOM_BASE = "https://api.tomtom.com/routing/1/calculateRoute";

interface TomTomSummary {
  lengthInMeters?: number;
  travelTimeInSeconds?: number;
  trafficDelayInSeconds?: number;
  noTrafficTravelTimeInSeconds?: number;
}

interface TomTomResponse {
  routes?: Array<{ summary?: TomTomSummary }>;
  errorText?: string;
  detailedError?: { message?: string };
}

export function tomtomUrl(route: Route, apiKey: string): string {
  const locations = `${route.origin.lat},${route.origin.lon}:${route.destination.lat},${route.destination.lon}`;
  const params = new URLSearchParams({
    key: apiKey,
    traffic: "true",
    travelMode: "car",
    routeType: "fastest",
    computeTravelTimeFor: "all",
    departAt: "now",
  });
  return `${TOMTOM_BASE}/${locations}/json?${params.toString()}`;
}

export function redactedUrl(route: Route): string {
  return tomtomUrl(route, "YOUR_KEY");
}

export async function fetchTravelTime(
  route: Route,
  apiKey: string,
  sampledAt: Date,
): Promise<TravelSample> {
  const response = await fetch(tomtomUrl(route, apiKey));
  const body = (await response.json()) as TomTomResponse;
  if (!response.ok) {
    const message =
      body.detailedError?.message ?? body.errorText ?? `${response.status} ${response.statusText}`;
    throw new Error(`TomTom error for ${route.id}: ${message}`);
  }
  const summary = body.routes?.[0]?.summary;
  if (summary?.travelTimeInSeconds == null) {
    throw new Error(`TomTom returned no travel time for ${route.id}`);
  }
  const noTraffic = summary.noTrafficTravelTimeInSeconds ?? null;
  const apiDelay = summary.trafficDelayInSeconds;
  const computedDelay =
    noTraffic != null ? Math.max(0, summary.travelTimeInSeconds - noTraffic) : null;
  return {
    route_id: route.id,
    sampled_at: sampledAt.toISOString(),
    travel_time_s: summary.travelTimeInSeconds,
    no_traffic_time_s: noTraffic,
    length_m: summary.lengthInMeters ?? null,
    traffic_delay_s: apiDelay ?? computedDelay,
    provider: "tomtom",
  };
}
