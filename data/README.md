# Loop Watch travel-time CSVs

Each successful TomTom sample is appended to a public file in this folder:

```
data/YYYY-MM/<metro>.csv
```

`YYYY-MM` is the metro's local calendar month. Metro files are `las-vegas.csv`, `nashville.csv`, and `orlando.csv`. Files are append-only. The header row is written once, when the file is created.

Columns:

| Column | Meaning |
|---|---|
| `route_id` | Route id from `routes.json` |
| `sampled_at_utc` | Sample timestamp in UTC (ISO 8601) |
| `sampled_at_local` | Same instant in the route's local timezone, with numeric offset |
| `travel_time_s` | Live travel time, seconds |
| `no_traffic_time_s` | Free-flow (no-traffic) travel time, seconds |
| `tti` | Travel time index: live / free-flow, three decimal places. Empty if free-flow is missing |
| `length_m` | Route distance, meters |
| `route_type` | `tunnel`, `future-tunnel`, `rail`, or `road-only` |

Rows checked into this folder are real TomTom Routing API readings, not invented values. A GitHub Actions workflow appends weekday rush-hour samples. Manual `--ids` runs may add off-window readings; those are still live API results, labeled by their timestamps.
