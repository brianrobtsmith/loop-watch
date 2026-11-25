import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TravelSample } from "./types.ts";

export function createSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to write samples.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function insertSamples(
  client: SupabaseClient,
  samples: TravelSample[],
): Promise<void> {
  if (samples.length === 0) return;
  const { error } = await client.from("travel_samples").insert(samples);
  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }
}
