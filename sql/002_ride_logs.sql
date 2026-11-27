-- Manual Loop / surface ride log.
-- Run this in the Supabase SQL editor after 001_init.sql. This file does not create a project.
-- Use it to record timed real rides (tunnel or surface) once a segment is open.
-- Wait, boarding, in-vehicle, and door-to-door times are measured fields; do not invent them.

create table if not exists public.ride_logs (
  id bigint generated always as identity primary key,
  ridden_at timestamptz not null,
  -- Optional link to a sampler route id, e.g. lv-westgate-airport.
  route_id text,
  origin_name text not null,
  destination_name text not null,
  direction text check (direction in ('southbound', 'northbound', 'eastbound', 'westbound', 'other')),
  mode text not null check (mode in ('tunnel', 'surface')),
  -- Queue / wait for a vehicle, timed at the origin station or curb.
  wait_s integer check (wait_s is null or wait_s >= 0),
  -- Time to board after the vehicle arrives.
  boarding_s integer check (boarding_s is null or boarding_s >= 0),
  -- Timed in-vehicle running time, origin departure to destination arrival.
  in_vehicle_s integer check (in_vehicle_s is null or in_vehicle_s >= 0),
  -- Time to alight at the destination.
  alighting_s integer check (alighting_s is null or alighting_s >= 0),
  -- Door-to-door, typically wait + boarding + in-vehicle + alighting when all are known.
  door_to_door_s integer check (door_to_door_s is null or door_to_door_s >= 0),
  -- Optional measured or posted tunnel / surface distance for this ride, in meters.
  length_m integer check (length_m is null or length_m > 0),
  notes text,
  recorded_by text,
  source text not null default 'manual',
  inserted_at timestamptz not null default now()
);

create index if not exists ride_logs_ridden_at_idx
  on public.ride_logs (ridden_at desc);

create index if not exists ride_logs_route_ridden_at_idx
  on public.ride_logs (route_id, ridden_at desc);

comment on table public.ride_logs is
  'Manually timed Loop or surface rides. One row per timed trip. Not a live Loop API.';

comment on column public.ride_logs.in_vehicle_s is
  'Timed in-vehicle running time only. Do not substitute a modeled or claimed time.';

comment on column public.ride_logs.wait_s is
  'Timed queue or wait before boarding. Leave null if not measured.';
