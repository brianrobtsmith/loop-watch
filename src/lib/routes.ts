import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Route, RoutesFile } from "./types.ts";

const CITIES = new Set(["las-vegas", "nashville", "orlando"]);
const ROLES = new Set(["treated", "control", "baseline"]);
const TYPES = new Set(["tunnel", "future-tunnel", "rail", "road-only"]);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPoint(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  const point = value as Record<string, unknown>;
  return (
    typeof point.name === "string" &&
    isFiniteNumber(point.lat) &&
    isFiniteNumber(point.lon) &&
    typeof point.source === "string"
  );
}

function isRoute(value: unknown): value is Route {
  if (value === null || typeof value !== "object") return false;
  const route = value as Record<string, unknown>;
  return (
    typeof route.id === "string" &&
    typeof route.public_name === "string" &&
    typeof route.city === "string" &&
    CITIES.has(route.city) &&
    typeof route.city_label === "string" &&
    typeof route.timezone === "string" &&
    typeof route.role === "string" &&
    ROLES.has(route.role) &&
    typeof route.type === "string" &&
    TYPES.has(route.type) &&
    isPoint(route.origin) &&
    isPoint(route.destination) &&
    isOptionalWaypointList(route.waypoints) &&
    typeof route.rationale === "string"
  );
}

function isOptionalWaypointList(value: unknown): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every(isPoint);
}

export function loadRoutes(path?: string): Route[] {
  const filePath =
    path ??
    join(dirname(fileURLToPath(import.meta.url)), "../../routes.json");
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as RoutesFile;
  if (!Array.isArray(parsed.routes) || parsed.routes.length === 0) {
    throw new Error(`No routes found in ${filePath}`);
  }
  for (const route of parsed.routes) {
    if (!isRoute(route)) {
      throw new Error(`Invalid route entry in ${filePath}: ${JSON.stringify(route)}`);
    }
  }
  return parsed.routes;
}
