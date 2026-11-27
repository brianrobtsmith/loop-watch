# Loop Watch

Loop Watch monitors whether Boring Company Loop systems actually reduce traffic on the streets above them. It samples travel times on treated corridors and on comparable control roads in Las Vegas, and it is building the same before-period record in Nashville and Orlando for when those tunnels open. A second comparison measures road trips that run alongside a rail line people can take instead (Las Vegas Monorail, WeGo Star, SunRail) against Road-Only corridors. The measure that matters is a sustained drop in travel time and delay on parallel surface roads, not ridership alone. Results stay here for measurement until the data and the controls can support a careful public explanation.

Phase 1 is a travel-time sampler. Nothing in this folder posts, emails, or deploys itself.

Vegas is the only city where a tunnel effect can be measured today (Tunnel Routes vs Road-Only). Nashville and Orlando Future Tunnel Routes are baseline collection only — Music City Loop is still tunneling, and Orlando has no Loop and no contract. Rail Routes are measured the same way as tunnels: surface travel time on a road trip that has a rail alternative, compared with a Road-Only corridor.

## Routes

24 origin/destination pairs (14 tunnel / future-tunnel comparisons, including a two-direction Westgate–Airport pair, a Paradise Road waypoint variant in each direction, and a 4744 Paradise Road–Airport surface-leg pair in each direction, plus 6 rail-section pairs). See `routes.md` for the table and `routes.json` for coordinates.

| City | Tunnel / Future Tunnel | Road-Only (tunnel comparison) | Rail | Road-Only (rail comparison) |
|---|---|---|---|---|
| Las Vegas | LVCC–Resorts World, LVCC–Westgate, South Strip–Sahara, Airport–Sahara; Westgate–Airport and Airport–Westgate (future tunnel; fastest and via Paradise Road); 4744 Paradise Road–Airport surface remainder (both directions) | Rainbow (Sahara–Flamingo), Charleston (Rainbow–Decatur) | SAHARA–MGM Grand (Paradise / Koval) | Tropicana, Decatur–Rainbow |
| Nashville | BNA–Lower Broadway (future tunnel) | Lower Broadway–Cool Springs | Mt. Juliet–Downtown (I-40) | Brentwood–Downtown (I-65) |
| Orlando | Epic Universe–CityWalk, Convention Center–CityWalk, MCO–CityWalk (future tunnel) | Winter Park–Altamonte Mall | Winter Park–Church Street (17-92 / I-4) | UCF–Downtown Orlando |

**Type labels.** *Tunnel Routes* are trips where a Loop already offers a way under the traffic (Vegas). *Future Tunnel Routes* are the same kind of trip collected as a baseline before a Loop is open on that alignment: Nashville, Orlando, and the Westgate–Airport / Paradise Road segment in Las Vegas (the new twin tunnels are not yet open to the public). *Rail Routes* are road trips that run alongside a rail line people can take instead. *Road-Only Routes* are similar trips with no tunnel or (in the rail section) no rail option.

Do not describe Orlando routes as "near I-Drive" in public copy. Use the public names above.

## Schedule

- Every **30 minutes**, **weekday rush hours only**, in each city's local time.
- Timezones: Las Vegas `America/Los_Angeles`, Nashville `America/Chicago`, Orlando `America/New_York`.
- Windows (inclusive of 30-minute endpoints; 15-minute grace after each window end for a late cron, not an extra planned slot):
  - Las Vegas: **6:30–9:30 a.m. and 3:30–6:30 p.m. PT** (14 slots/weekday). Sources: FAST signal timing AM 6:30–9:15; PM core within RTC CMP/PHED 3–7 p.m. and UCR 4–7 p.m. FAST PM plans can run 2–7, which is too wide for a commute sampler.
  - Nashville: **7:00–9:30 a.m. and 3:30–6:30 p.m. CT** (13 slots/weekday). Sources: TDOT Inner Loop PEL / HOV 7–9 a.m. and 4–6 p.m. Mon–Fri (including I-40 east and I-65 south); ATRI/news I-40 at I-65 backups ~3–6 p.m.
  - Orlando: **7:00–9:30 a.m. and 4:00–6:30 p.m. ET** (12 slots/weekday). Sources: MetroPlan/City TIA standard 7–9 a.m. and 4–6 p.m.; MetroPlan Orlando MTP 2050 Ch. 4 (adopted Dec 10, 2025) documents PM spreading to ~4:30–6:30.
- **Weekdays only.** Saturday and Sunday are skipped even if the clock falls inside a peak window.
- The script itself enforces the windows in each city's local timezone, including daylight-saving changes. The GitHub Actions cron is a UTC envelope that covers both standard and daylight time (see Cron below). Routes outside a local weekday rush window are skipped and do not call TomTom.
- Most pairs are sampled in one direction, to stay inside the TomTom free tier. The Westgate–Airport future-tunnel pair is sampled in both directions, and a second pair in each direction is forced via Paradise Road (a waypoint at Thomas & Mack latitude) so the street the new tunnels parallel is timed separately from TomTom's fastest route, which may use I-15 or Swenson.

**Tradeoff.** Rush-hour-only collection misses midday and evening event peaks (Vegas convention turnover, Orlando park closing). The free-tier budget after this cut would allow a later event-day mode without leaving the 20,000-call cap; that mode is not enabled now.

## Cost

TomTom Routing API allows **20,000 free requests per month** on the freemium plan (no credit card).

Planned calls use inclusive 30-minute slots and ~22 weekdays/month (a rough working assumption; federal holidays would be slightly fewer):

- Las Vegas: 14 routes × 14 slots × 22 weekdays = **4,312**
- Nashville: 4 routes × 13 slots × 22 weekdays = **1,144**
- Orlando: 6 routes × 12 slots × 22 weekdays = **1,584**
- **Total: 7,040 calls/month**

That is just over the earlier ~7,000 working budget and still well under the 20,000 free cap. The Westgate–Airport fastest and Paradise Road pairs added 4 × 14 × 22 = 1,232 calls versus the previous 5,192 total for 18 routes. The 4744 Paradise Road–Airport surface-leg pair adds another 2 × 14 × 22 = 616, for 7,040. The earlier all-day design for 18 routes was 18 × 32 slots (16 hours × 2) × 30 calendar days = **17,280** calls/month (or 18 × 33 inclusive 06:00–22:00 slots × 30 = **17,820**).

Samples are appended to public CSV files in this repo. GitHub Actions at this cadence is within the included minutes of a standard public-repo plan. There is no dashboard host and no database required in Phase 1.

## Data storage

Each successful sample is appended to a public CSV file in this repository: `data/YYYY-MM/<metro>.csv`, where `YYYY-MM` is the metro's local calendar month and `<metro>` is `las-vegas`, `nashville`, or `orlando`. Files are append-only; the header is written once. Columns are `route_id`, `sampled_at_utc`, `sampled_at_local`, `travel_time_s`, `no_traffic_time_s`, `tti`, `length_m`, and `route_type`. See `data/README.md`.

The `sql/` folder is optional reference only, if you later want a database. The default sampler path does not use it.

## Setup

1. **TomTom key.** Create a free developer account at [developer.tomtom.com](https://developer.tomtom.com/) and copy a Routing API key.
2. Copy `.env.example` to `.env` and set `TOMTOM_API_KEY`. Never commit `.env`.
3. `npm install`
4. `npm run sample:dry` — prints the planned requests for the current local windows, no key required.
5. `npm run sample -- --all --dry-run` — prints all 24 routes and ignores the windows, no API call.
6. `npm run sample -- --ids=lv-westgate-airport,lv-airport-westgate --print-only` — calls TomTom only for the listed route ids and prints JSON, without writing CSV.
7. `npm run sample` — samples routes in the local weekday rush windows and appends rows to `data/`.

Flags:

- `--dry-run` — print the plan; no API, no CSV write.
- `--all` — ignore the weekday rush-hour windows (use for a one-off test).
- `--ids=id1,id2` — sample only these route ids, ignoring the windows (use for a one-off test).
- `--print-only` — call TomTom, print JSON, do not append to CSV.

## Cron

The workflow in `.github/workflows/sample.yml` runs the sampler on a 30-minute cadence during weekday rush hours, then commits any new CSV rows with `GITHUB_TOKEN` (`permissions: contents: write`). If no rows were written, the commit step is skipped. The only repository secret required is `TOMTOM_API_KEY`, added at [github.com/brianrobtsmith/loop-watch/settings/secrets/actions](https://github.com/brianrobtsmith/loop-watch/settings/secrets/actions). Actions must also be enabled for the repository, after which a `workflow_dispatch` run or the next scheduled slot will start collection.

GitHub cron is UTC and does not follow US daylight saving automatically. The schedule is therefore a UTC envelope that covers both standard and daylight time. The sampler still gates each city in its local timezone, so off-window runs do not call TomTom. In Eastern and Pacific terms:

- **Morning (America/New_York and America/Los_Angeles):** every 30 minutes from 11:00–17:30 UTC, Monday–Friday. That covers Orlando 7:00–9:30 a.m. ET and Las Vegas 6:30–9:30 a.m. PT in both EDT/EST and PDT/PST, plus the 15-minute grace.
- **Evening, first half:** every 30 minutes from 20:00–23:30 UTC, Monday–Friday, covering Orlando 4:00 p.m. ET onward in both DST modes.
- **Evening, after midnight UTC:** every 30 minutes from 00:00–02:30 UTC, Tuesday–Saturday, covering Las Vegas 3:30–6:30 p.m. PT through the end of the window in PST (6:30 p.m. PT = 02:30 UTC).

Nashville's 7:00–9:30 a.m. and 3:30–6:30 p.m. CT windows sit inside that same envelope.

Manual runs: the workflow also has `workflow_dispatch`.



## Tunnel vs surface times (Westgate–Airport)

There is no live public API for Loop trip times. Surface times come from the TomTom sampler on the Westgate–Airport pairs above and are stored in `data/`. Tunnel times, once the new Paradise Road twin tunnels are open to the public, can be recorded as timed rides; `sql/002_ride_logs.sql` remains only as an optional schema reference. Until then, only published figures and a clearly labeled model are used. Do not invent wait, dwell, or running times.

**Published figures (sourced, not measured by Loop Watch):**

- LVCC campus Loop in-vehicle time: LVCVA’s June 2021 fact sheet says it “takes less than two minutes to carry passengers across the convention center campus,” versus a 20–30 minute walk. An April 2021 LVCVA release uses “just under two minutes” for the same campus trip, and says vehicles “have capacity to go 150 mph but will travel at 35-40 mph due to the short distance of the tunnels.” The 150 mph figure is published design potential, not an operating speed in Las Vegas. ([LVCVA fact sheet](https://www.multivu.com/players/English/8909751-lvcva-las-vegas-convention-center-expansion-informa-market-world-of-concrete/docs/LVCCLoopFactSheet_1623197150335-342771355.pdf); [LVCVA, April 9, 2021](https://press.lvcva.com/News-Releases/first-look-inside-elon-musk-s-underground-transportation-system-beneath-the-las-vegas-convention-cen/s/ea9122f4-c70c-4448-a140-79c3253f85ef))
- The Boring Company’s LVCC project page says the campus Loop “reduces a 45-minute cross-campus walk to approximately 2 minutes.” ([TBC LVCC Loop](https://boringcompany.com/projects/las-vegas-convention-center-loop))
- System-wide published range: the official Vegas Loop project page says the system has “transit times between 2 and 8 minutes.” That is a company-published range for the operating system, not a measured Westgate-to-airport time, and not a time for the unopened Paradise tunnels. ([TBC Vegas Loop](https://boringcompany.com/projects/las-vegas-loop))
- Operating / planned speed limits (Steve Davis to the Las Vegas Review-Journal, January 9, 2026): the convention-center, Encore, Resorts World, and Westgate portions “run at 35 mph”; “the speed limit of the University Center Loop portion will be 60 mph.” The 60 mph figure is a planned limit for the new Paradise / University Center tunnels, not a demonstrated average speed. ([Review-Journal, January 9, 2026](https://www.reviewjournal.com/local/traffic/boring-co-s-vegas-loops-future-build-detailed-by-company-president-3605797/))
- Westgate → 4744 Paradise / Thomas & Mack segment: The Boring Company’s November 25, 2026 post describes “2.3 miles through Las Vegas, starting at the Westgate Resort and ending across from UNLV’s Thomas & Mack Center (and then to Airport),” and says 14 additional stations open when the twin tunnels open to the public. They are not yet open. Davis told the Review-Journal the under-construction segment was a “2.2-mile dual direction tunnel system from Westgate to a station planned for 4744 Paradise Road,” after which vehicles would “travel above ground to the airport via Paradise and University Center Drive” until later phases extend the tunnel. No published in-vehicle time for Westgate–Airport on this new alignment was found. ([TBC post](https://x.com/boringcompany/status/2125742541253300563); [Review-Journal, January 9, 2026](https://www.reviewjournal.com/local/traffic/boring-co-s-vegas-loops-future-build-detailed-by-company-president-3605797/))
- Observed campus ride vs. “2 minutes”: the Review-Journal (November 14, 2021) reported that a TechCrunch review of early trip reports found an average trip of about four minutes, twice the two-minute goal; LVCVA said the ride itself takes two minutes and that load/unload and other experience time were not included in that two-minute figure. That is a useful caution that published running times may exclude wait and boarding. ([Review-Journal, November 14, 2021](https://www.reviewjournal.com/news/news-columns/road-warrior/vegas-loops-ride-times-capacity-not-a-problem-says-lvcva-2478628/))

**Proposed model (labeled; do not treat as a measurement):**

`T_in_vehicle = T_run + T_surface_remainder`

Waiting for a ride and boarding are excluded on both sides.

- `T_run` for the unopened Westgate–4744 Paradise tunnels, if a vehicle traveled the published 2.3 miles at the planned 60 mph limit for the whole distance, would be 2.3 / 60 hours = **2.3 minutes of running time**. That is an arithmetic illustration only: it assumes travel at the planned limit, ignores acceleration and deceleration (not published), uses 2.3 miles rather than the 2.2-mile figure from January 2026, and is not a measured average. Using 2.2 miles at 60 mph would be 2.2 minutes. Using the 35 mph limit that Davis said applies to the existing Westgate / convention-center portions would be 2.3 / 35 hours ≈ **3.9 minutes** of running time on 2.3 miles — also an illustration, not a measurement. The publishable Low / Mid / High cases below use 2.3 / 3.0 / 4.0 minutes for this term.
- `T_surface_remainder`: under the January 2026 Phase 2 description, the trip from 4744 Paradise Road to the airport would still include an above-ground leg. That remainder is sampled on `lv-paradise4744-airport` and `lv-airport-paradise4744`. Do not invent a surface-leg time. The comparison is this in-vehicle sum versus the live TomTom Westgate–Airport fastest and via-Paradise samples.

**Publishable assumptions (Low / Mid / High), not measurements.** The cases in `config/tunnel-assumptions.json` are working assumptions for an in-vehicle comparison until timed rides exist. They are not observed Loop trip times. Waiting for a ride and boarding are excluded on both sides. In-tunnel running time is calculated over the published 2.3 miles:

| Case | In-tunnel run | Basis |
|---|---|---|
| Low | 2.3 min | 2.3 mi at the planned 60 mph University Center Loop limit (Steve Davis to the Las Vegas Review-Journal, January 9, 2026). Assumes travel at that limit for the whole distance; acceleration and deceleration are not published. |
| Mid | 3.0 min | The 2.3-minute limit-speed run plus about 40 seconds of acceleration and deceleration. The 40-second allowance is an assumption; those times are not published. |
| High | 4.0 min | 2.3 mi at the 35 mph operating limit Davis said applies to the existing convention-center, Encore, Resorts World, and Westgate portions (2.3 / 35 hours ≈ 3.9 minutes, rounded to 4.0). |

The comparison is assumed in-tunnel run plus the TomTom-sampled surface remainder on `lv-paradise4744-airport` / `lv-airport-paradise4744`, versus the live TomTom Westgate–Airport fastest and via-Paradise samples.

**Ride log.** When the segment is open, timed rides can be recorded with wait, boarding, in-vehicle, alighting, and door-to-door, plus direction and mode (`tunnel` or `surface`), and compared with the TomTom CSV rows on the matching Westgate–Airport surface routes. `sql/002_ride_logs.sql` is an optional database schema only; this project does not use a hosted database.

**Dashboard section.** The “Tunnel vs surface” section compares in-vehicle times only, for each direction:

- Surface (TomTom sample): live travel time, free-flow time, TTI (`live / free-flow`), distance, and sample timestamp for Westgate–Airport fastest and via Paradise Road. Source: the public CSV files under `data/`.
- Tunnel in-vehicle: the labeled Low / Mid / High in-tunnel run from `config/tunnel-assumptions.json`, plus the live TomTom surface leg on `lv-paradise4744-airport` / `lv-airport-paradise4744`. These run times are assumptions, not measurements. Once rides are logged, measured `ride_logs.in_vehicle_s` can be shown beside the model, never mixed without a label.
- Waiting for a ride and boarding are excluded on both sides.
- A note that Phase 2, as described in January 2026, is hybrid: tunnel to a station planned at 4744 Paradise Road, then surface to the airport, until a later on-airport station exists. The 2–8 minute company range is system-wide, not a Westgate–Airport measurement.

Keep sample-data and model labels visible. Do not present a 60 mph running-time illustration as a measured result.


## Stack

- Node 20+, TypeScript, `tsx`
- TomTom Calculate Route v1, `traffic=true`, `computeTravelTimeFor=all`
- Public CSV files under `data/YYYY-MM/`

Research that led to this design is in `/workspace/boring-florida/traffic-tracker-research.md`.
