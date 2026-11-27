import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Route, TravelSample } from "./types.ts";
import { formatLocalIso, yearMonth } from "./window.ts";

export const CSV_HEADER =
  "route_id,sampled_at_utc,sampled_at_local,travel_time_s,no_traffic_time_s,tti,length_m,route_type";

function repoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "../..");
}

export function csvPathFor(route: Route, at: Date, root = repoRoot()): string {
  return join(root, "data", yearMonth(route.timezone, at), `${route.city}.csv`);
}

function csvField(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function ttiValue(sample: TravelSample): string {
  if (sample.no_traffic_time_s == null || sample.no_traffic_time_s <= 0) {
    return "";
  }
  return (sample.travel_time_s / sample.no_traffic_time_s).toFixed(3);
}

export function sampleRow(route: Route, sample: TravelSample, at: Date): string {
  return [
    csvField(sample.route_id),
    csvField(sample.sampled_at),
    csvField(formatLocalIso(route.timezone, at)),
    csvField(sample.travel_time_s),
    csvField(sample.no_traffic_time_s),
    csvField(ttiValue(sample) || null),
    csvField(sample.length_m),
    csvField(route.type),
  ].join(",");
}

function hasHeader(path: string): boolean {
  if (!existsSync(path)) return false;
  const first = readFileSync(path, "utf8").split(/\r?\n/, 1)[0]?.trim();
  return first === CSV_HEADER;
}

/** Append samples to data/YYYY-MM/<city>.csv, writing the header once. */
export function appendSamples(
  entries: Array<{ route: Route; sample: TravelSample }>,
  at: Date,
  root = repoRoot(),
): string[] {
  const written: string[] = [];
  const byPath = new Map<string, string[]>();
  for (const { route, sample } of entries) {
    const path = csvPathFor(route, at, root);
    const rows = byPath.get(path) ?? [];
    rows.push(sampleRow(route, sample, at));
    byPath.set(path, rows);
  }
  for (const [path, rows] of byPath) {
    mkdirSync(dirname(path), { recursive: true });
    const prefix = hasHeader(path) ? "" : `${CSV_HEADER}\n`;
    appendFileSync(path, `${prefix}${rows.join("\n")}\n`, "utf8");
    written.push(path.slice(root.length + 1).replaceAll("\\", "/"));
  }
  return written;
}
