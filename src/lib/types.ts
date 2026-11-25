export type RouteRole = "treated" | "control" | "baseline";
export type RouteType = "tunnel" | "future-tunnel" | "rail" | "road-only";
export type CityId = "las-vegas" | "nashville" | "orlando";

export interface Point {
  name: string;
  lat: number;
  lon: number;
  source: string;
}

export interface Route {
  id: string;
  public_name: string;
  city: CityId;
  city_label: string;
  timezone: string;
  role: RouteRole;
  type: RouteType;
  origin: Point;
  destination: Point;
  rationale: string;
}

export interface RoutesFile {
  version: number;
  routes: Route[];
}

export interface TravelSample {
  route_id: string;
  sampled_at: string;
  travel_time_s: number;
  no_traffic_time_s: number | null;
  length_m: number | null;
  traffic_delay_s: number | null;
  provider: "tomtom";
}

export interface CliOptions {
  dryRun: boolean;
  all: boolean;
  printOnly: boolean;
}
