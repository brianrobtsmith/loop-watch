# Loop Watch

Loop Watch monitors whether Boring Company Loop systems actually reduce traffic on the streets above them. It samples travel times on treated corridors and on comparable control roads in Las Vegas, and it is building the same before-period record in Nashville and Orlando for when those tunnels open. A second comparison measures road trips that run alongside a rail line people can take instead (Las Vegas Monorail, WeGo Star, SunRail) against Road-Only corridors. The measure that matters is a sustained drop in travel time and delay on parallel surface roads, not ridership alone. Results stay here for measurement until the data and the controls can support a careful public explanation.

Phase 1 is a travel-time sampler. Nothing in this folder posts, emails, or deploys itself.

Vegas is the only city where a tunnel effect can be measured today (Tunnel Routes vs Road-Only). Nashville and Orlando Future Tunnel Routes are baseline collection only — Music City Loop is still tunneling, and Orlando has no Loop and no contract. Rail Routes are measured the same way as tunnels: surface travel time on a road trip that has a rail alternative, compared with a Road-Only corridor.

## Routes

18 one-way origin/destination pairs (12 tunnel / future-tunnel comparisons + 6 rail-section pairs). See `routes.md` for the table and `routes.json` for coordinates.

| City | Tunnel / Future Tunnel | Road-Only (tunnel comparison) | Rail | Road-Only (rail comparison) |
|---|---|---|---|---|
| Las Vegas | LVCC–Resorts World, LVCC–Westgate, South Strip–Sahara, Airport–Sahara | Rainbow (Sahara–Flamingo), Charleston (Rainbow–Decatur) | SAHARA–MGM Grand (Paradise / Koval) | Tropicana, Decatur–Rainbow |
| Nashville | BNA–Lower Broadway (future tunnel) | Lower Broadway–Cool Springs | Mt. Juliet–Downtown (I-40) | Brentwood–Downtown (I-65) |
| Orlando | Epic Universe–CityWalk, Convention Center–CityWalk, MCO–CityWalk (future tunnel) | Winter Park–Altamonte Mall | Winter Park–Church Street (17-92 / I-4) | UCF–Downtown Orlando |

**Type labels.** *Tunnel Routes* are trips where a Loop already offers a way under the traffic (Vegas). *Future Tunnel Routes* are the same kind of trip in Nashville and Orlando, collected as a baseline before a Loop opens. *Rail Routes* are road trips that run alongside a rail line people can take instead. *Road-Only Routes* are similar trips with no tunnel or (in the rail section) no rail option.

Do not describe Orlando routes as "near I-Drive" in public copy. Use the public names above.

## Schedule

- Every **30 minutes**, **weekday rush hours only**, in each city's local time.
- Timezones: Las Vegas `America/Los_Angeles`, Nashville `America/Chicago`, Orlando `America/New_York`.
- Windows (inclusive of 30-minute endpoints; 15-minute grace after each window end for a late cron, not an extra planned slot):
  - Las Vegas: **6:30–9:30 a.m. and 3:30–6:30 p.m. PT** (14 slots/weekday). Sources: FAST signal timing AM 6:30–9:15; PM core within RTC CMP/PHED 3–7 p.m. and UCR 4–7 p.m. FAST PM plans can run 2–7, which is too wide for a commute sampler.
  - Nashville: **7:00–9:30 a.m. and 3:30–6:30 p.m. CT** (13 slots/weekday). Sources: TDOT Inner Loop PEL / HOV 7–9 a.m. and 4–6 p.m. Mon–Fri (including I-40 east and I-65 south); ATRI/news I-40 at I-65 backups ~3–6 p.m.
  - Orlando: **7:00–9:30 a.m. and 4:00–6:30 p.m. ET** (12 slots/weekday). Sources: MetroPlan/City TIA standard 7–9 a.m. and 4–6 p.m.; MetroPlan Orlando MTP 2050 Ch. 4 (adopted Dec 10, 2025) documents PM spreading to ~4:30–6:30.
- **Weekdays only.** Saturday and Sunday are skipped even if the clock falls inside a peak window.
- The script itself enforces the windows, so a single every-30-minute cron can run 24 hours a day. Routes outside a local weekday rush window are skipped and do not call TomTom.
- One direction per pair, to stay inside the TomTom free tier.

**Tradeoff.** Rush-hour-only collection misses midday and evening event peaks (Vegas convention turnover, Orlando park closing). The free-tier budget after this cut would allow a later event-day mode without leaving the 20,000-call cap; that mode is not enabled now.

## Cost

TomTom Routing API allows **20,000 free requests per month** on the freemium plan (no credit card).

Planned calls use inclusive 30-minute slots and ~22 weekdays/month (a rough working assumption; federal holidays would be slightly fewer):

- Las Vegas: 8 routes × 14 slots × 22 weekdays = **2,464**
- Nashville: 4 routes × 13 slots × 22 weekdays = **1,144**
- Orlando: 6 routes × 12 slots × 22 weekdays = **1,584**
- **Total: 5,192 calls/month**

That is well under the cap. The previous all-day design for these 18 routes was 18 × 32 slots (16 hours × 2) × 30 calendar days = **17,280** calls/month (or 18 × 33 inclusive 06:00–22:00 slots × 30 = **17,820**). Rush-hour-only cuts the budget by about 70%.

Supabase free tier is enough for this volume. GitHub Actions on a private repo is free at this cadence. There is no dashboard host required in Phase 1.

## Setup (when you are ready)

This repo does not create a TomTom account, a Supabase project, or a hosted cron. You do that once, then the script can run.

1. **TomTom key.** Create a free developer account at [developer.tomtom.com](https://developer.tomtom.com/) and copy a Routing API key.
2. **Supabase project.** A new free project named `loop-watch` is the cleanest option, so this data stays separate from other apps. An existing project is fine if you prefer; run the SQL in that project's editor either way. Open the SQL editor and run `sql/001_init.sql`. That creates `travel_samples` and the `travel_samples_tti` view (`tti = travel_time_s / no_traffic_time_s`).
3. Copy `.env.example` to `.env` and set `TOMTOM_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. The service role key is server-side only; do not put it in a browser app or a public repository.
4. `npm install`
5. `npm run sample:dry` — prints the planned requests for the current local windows, no key required.
6. `npm run sample -- --all --dry-run` — prints all 18 routes and ignores the windows, no API call.
7. `npm run sample -- --all --print-only` — calls TomTom for every route and prints rows, no database write. Do not run this unless a live test has been approved.
8. `npm run sample` — samples routes in the local weekday rush windows and inserts into Supabase.

Flags:

- `--dry-run` — print the plan; no API, no database.
- `--all` — ignore the weekday rush-hour windows (use for a one-off test).
- `--print-only` — call TomTom, print JSON, do not write to Supabase.

## Cron (recommended later)

**GitHub Actions on a private repository** is the recommended host. A workflow can run `npm run sample` on `*/30 * * * *`. Store `TOMTOM_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` as repository secrets. A template is in `.github/workflows/sample.yml`; do not push or enable it until you want collection to start.

Supabase scheduled Edge Functions or Vercel cron are workable later. Vercel Hobby cron is a poor fit (too infrequent). Do not run this as a public API.

## Stack

- Node 20+, TypeScript, `tsx`
- TomTom Calculate Route v1, `traffic=true`, `computeTravelTimeFor=all`
- Supabase Postgres (`travel_samples`)

Research that led to this design is in `/workspace/boring-florida/traffic-tracker-research.md`.
