-- Optional reference only. The default sampler writes public CSV files under data/. This SQL is unused unless you later choose a database.
-- Loop Watch Phase 1 schema
-- Run this in the Supabase SQL editor. This file does not create a project.

create table if not exists public.travel_samples (
  id bigint generated always as identity primary key,
  route_id text not null,
  sampled_at timestamptz not null,
  travel_time_s integer not null,
  no_traffic_time_s integer,
  length_m integer,
  traffic_delay_s integer,
  provider text not null default 'tomtom',
  inserted_at timestamptz not null default now()
);

create index if not exists travel_samples_route_sampled_at_idx
  on public.travel_samples (route_id, sampled_at desc);

create index if not exists travel_samples_sampled_at_idx
  on public.travel_samples (sampled_at desc);

comment on table public.travel_samples is
  'Loop Watch travel-time samples. One row per successful TomTom Routing call.';

-- Travel Time Index = congested time / free-flow (no-traffic) time.
-- Values above 1 mean delay. Null when no_traffic_time_s is missing or zero.
create or replace view public.travel_samples_tti as
select
  s.*,
  case
    when s.no_traffic_time_s is not null and s.no_traffic_time_s > 0
      then round(s.travel_time_s::numeric / s.no_traffic_time_s, 3)
    else null
  end as tti
from public.travel_samples s;

comment on view public.travel_samples_tti is
  'travel_samples plus tti = travel_time_s / no_traffic_time_s.';
