import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRoutes } from "./lib/routes.ts";
import { createSupabaseAdmin, insertSamples } from "./lib/supabase.ts";
import { fetchTravelTime, redactedUrl } from "./lib/tomtom.ts";
import type { CliOptions, Route, TravelSample } from "./lib/types.ts";
import {
  formatLocalTime,
  isWithinSampleWindow,
  windowLabel,
} from "./lib/window.ts";

function parseArgs(argv: string[]): CliOptions {
  return {
    dryRun: argv.includes("--dry-run"),
    all: argv.includes("--all"),
    printOnly: argv.includes("--print-only"),
  };
}

function loadEnvFile(): void {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), "../.env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function selectRoutes(routes: Route[], options: CliOptions, at: Date): Route[] {
  if (options.all) return routes;
  return routes.filter((route) =>
    isWithinSampleWindow(route.city, route.timezone, at),
  );
}

function printPlan(routes: Route[], skipped: Route[], at: Date): void {
  console.log(`Loop Watch dry run at ${at.toISOString()} (UTC)`);
  if (skipped.length > 0) {
    console.log(
      `Skipping ${skipped.length} route(s) outside weekday rush-hour windows:`,
    );
    for (const route of skipped) {
      console.log(
        `  - ${route.id} (${route.city_label} ${formatLocalTime(route.timezone, at)}; samples ${windowLabel(route.city)})`,
      );
    }
  }
  if (routes.length === 0) {
    console.log("No routes in a local weekday rush-hour window. Exiting.");
    return;
  }
  console.log(`Would request ${routes.length} TomTom route(s):`);
  for (const route of routes) {
    console.log(`  ${route.id}`);
    console.log(`    ${route.public_name} [${route.type} / ${route.role}]`);
    console.log(
      `    ${route.origin.lat},${route.origin.lon} -> ${route.destination.lat},${route.destination.lon}`,
    );
    console.log(
      `    local ${formatLocalTime(route.timezone, at)} (samples ${windowLabel(route.city)})`,
    );
    console.log(`    ${redactedUrl(route)}`);
  }
}

async function main(): Promise<void> {
  loadEnvFile();
  const options = parseArgs(process.argv.slice(2));
  const allRoutes = loadRoutes();
  const at = new Date();
  const selected = selectRoutes(allRoutes, options, at);
  const skipped = allRoutes.filter((route) => !selected.includes(route));

  if (options.dryRun) {
    printPlan(selected, skipped, at);
    return;
  }

  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TOMTOM_API_KEY is missing. Run with --dry-run, or set the key in .env or the environment.",
    );
  }

  if (selected.length === 0) {
    console.log(
      `No routes in a local weekday rush-hour window at ${at.toISOString()}. Nothing to sample.`,
    );
    return;
  }

  const samples: TravelSample[] = [];
  const failures: string[] = [];
  for (const [index, route] of selected.entries()) {
    try {
      const sample = await fetchTravelTime(route, apiKey, at);
      samples.push(sample);
      const tti =
        sample.no_traffic_time_s && sample.no_traffic_time_s > 0
          ? (sample.travel_time_s / sample.no_traffic_time_s).toFixed(3)
          : "n/a";
      console.log(
        `${route.id}: ${sample.travel_time_s}s travel, ${sample.traffic_delay_s ?? "n/a"}s delay, TTI ${tti}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(message);
      console.error(message);
    }
    if (index < selected.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  const canWrite =
    !options.printOnly &&
    Boolean(process.env.SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!canWrite) {
    console.log(JSON.stringify(samples, null, 2));
    if (!options.printOnly) {
      console.log(
        "Supabase env not set; printed samples and skipped insert. Use --print-only to make that explicit.",
      );
    }
  } else {
    await insertSamples(createSupabaseAdmin(), samples);
    console.log(`Inserted ${samples.length} sample(s) into travel_samples.`);
  }

  if (failures.length > 0) {
    throw new Error(`${failures.length} of ${selected.length} TomTom request(s) failed.`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
