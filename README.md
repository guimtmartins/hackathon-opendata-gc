# Switch Guard

**Live demo:** [hackathon-opendata-gc.vercel.app](https://hackathon-opendata-gc.vercel.app/)

React + Vite + Supabase app built for the **Gold Coast Open Data Challenge 2026**.
It overlays the City of Gold Coast's live flood-risk modeling on its live
electrical-switchboard network, then lets you run a **flood outage simulation**
over a real demo region (Runaway Bay and its surrounding suburbs): watch
switchboards fail, see the estimated people and economic cost affected, check
which council facilities lose power, and walk through a technician repair
workflow that brings the grid back online.

Every number on screen is traceable to a real request — every data card has a
**"View call"** button that shows the exact URL, parameters, and a live sample
response.

## What's on screen

**Map** — two live layers, toggled from the header:
- **Flood risk** — 2024 modeling, City of Gold Coast, circle size/colour by risk score
- **Electrical switchboards** — every mapped switchboard in the demo region, sized by class (Small/Medium/Large) and coloured by the flood risk of its nearest suburb

**Grid status** (left panel) — a live online/offline board for the demo region's
switchboards, one row per suburb with switchboard count, critical-infrastructure
count, and flood risk score.

**Outage simulation** — a header button starts a what-if scenario: a flood event
knocks out the region's most exposed switchboards. Two floating sliders control it:
- **Severity** (Minor / Moderate / Severe) — sets how many switchboards ultimately fail (5 / 10 / 20), ranked by a deterministic exposure score (critical infrastructure first, then higher suburb flood risk, then larger switchboard class)
- **Hours since flood began** — ramps failures up from 0 to the severity's target over 6 hours, so the outage visibly builds rather than jumping straight to the end state

While the simulation runs, two panels open from Grid status:
- **Impact estimate** — people affected and estimated economic cost per hour, plus an hour-by-hour "damage over time" chart. Built from ABS Census 2021 population per suburb and the AER Value of Customer Reliability (2019) cost-per-household-hour — both assumptions stated on screen, both clearly non-measurements.
- **Contingency plan** — a dispatch priority order (most people affected first), and every council community facility (library, community centre, child care, sports complex) in the region flagged **IN OUTAGE** or **POWERED**, based on whether it geometrically falls inside an offline switchboard's indicative service radius.

**Repair checklist** (right panel) — one card per offline switchboard, with a
4-step repair workflow (dispatch → isolate → inspect → re-energize). Check off
all four steps and confirm to bring that specific switchboard back online, as
if a technician had gone on-site and fixed it.

**Insights drawer** — Storm Watch (live rain forecast × flood-risk history),
the priority action list (flood risk × critical infrastructure exposure by
suburb), and the full Data sources panel with "View call" on every live layer.

## Data sources

Only two data portals are used, per the challenge rules — plus two clearly
labelled external sources the portals don't publish:

| Data | Source | Live or static? |
|---|---|---|
| **Flood risk** | ArcGIS `Flood_Risk_Overlay_2024/FeatureServer/35` | **Live** — aggregated server-side via ArcGIS `outStatistics`, so raw polygons never hit the browser |
| **Electrical switchboards** | ArcGIS `Switchboard/FeatureServer` | **Live** — full dataset, ~4,100 records city-wide |
| **Community buildings** | ArcGIS `Buildings_FL/FeatureServer` | **Live** — council-maintained facilities (community centres, libraries, child care, sporting complexes) |
| **Suburb centroids** | Supabase table `suburbs` | Static — seeded once from the official "Suburbs" boundary layer; used to bucket switchboards/buildings to a suburb |
| **Rain forecast** | Open-Meteo | **Live, external source** — not one of the two official portals |
| **Population** | ABS Census 2021 QuickStats | Static, **external source** — neither official portal publishes suburb-level population |

An earlier version of this project ("DataGap Gold Coast") also cross-referenced
zoning and historical development-approval data; that line of analysis was
retired after the hackathon judging to keep the app focused on what's actually
on screen — flood risk and the electrical grid.

## Demo region

The map and every panel are scoped to **Runaway Bay and 7 neighbouring
suburbs** (Hollywell, Paradise Point, Coombabah, Biggera Waters, Labrador,
Arundel, South Stradbroke) — a deliberate demo focus, not a data limitation.
The underlying fetches pull the full live datasets; only the display is
filtered. To go city-wide, set `FOCUS_SUBURBS` to `[]` in
[`src/data/densityColors.js`](src/data/densityColors.js).

## Architecture

```
src/
  App.jsx                        # orchestrates hooks, layersOn, the outage simulation state
  App.css                        # dark theme — floating panels over a full-bleed map
  main.jsx
  lib/
    supabaseClient.js            # Supabase client
    arcgis.js                    # live ArcGIS fetch helpers (flood, switchboards, buildings), geo utils
    weather.js                   # fetchRainForecast (Open-Meteo)
  hooks/
    useFloodRisk.js, useSuburbs.js, useSwitchboards.js
    useRainForecast.js, useCommunityBuildings.js
  data/
    densityColors.js             # colours, severity/ramp model, focus-region config
    population.js                # ABS Census population + outage-cost assumptions
  components/
    MapView.jsx                  # Leaflet map: flood risk + switchboards layers
    GridStatus.jsx               # left panel: online/offline board, Impact + Contingency modals
    SeveritySlider.jsx           # floating severity + hours-since-flood controls
    RepairChecklist.jsx          # right panel: per-board repair workflow
    Sidebar.jsx                  # Insights drawer: Storm Watch, priority list, Data sources
    StormWatch.jsx, PriorityActions.jsx
    ApiInspector.jsx             # "View call" modal — real URL/params/sample response
supabase/
  schema.sql                     # suburbs table (centroids) + seed
```

## Running locally

1. Create a Supabase project (supabase.com → New Project; free tier is enough).
2. In the SQL Editor, run `supabase/schema.sql`. This creates the `suburbs`
   table and seeds every Gold Coast suburb centroid.
3. Copy `.env.example` to `.env` and fill in the project URL and anon key
   (Project Settings → API):

   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
4. Install and run:

   ```
   npm install
   npm run dev
   ```

Other scripts: `npm run build` (production build), `npm run lint` (oxlint),
`npm run preview` (preview a production build locally).

Supabase's free tier pauses a project after ~1 week of inactivity — reactivate
it from the dashboard before demoing after a period of inactivity.

## Known limitations

- **No real electrical service-area data exists.** The 150m/300m/600m
  indicative coverage radii (by switchboard size class) are nominal,
  for visualisation only — no public dataset publishes a switchboard's actual
  service area.
- **The outage simulation is a deterministic what-if, not a prediction.**
  Which switchboards fail is a fixed exposure ranking (critical status → flood
  risk → size), and the hours-since-flood ramp is a stated linear assumption —
  not a measured flood-propagation model. No machine learning is involved
  anywhere in the app; every number is a plain, traceable formula.
- **Impact estimates are estimates, not measurements** — stated on screen
  every time they're shown. People-affected assumes population is spread
  evenly across a suburb's switchboards (the only defensible allocation
  without real per-switchboard service-area data); the economic cost uses the
  AER's published Value of Customer Reliability, not a local business survey.
- **Facility outage status is geometric**, not a report from the affected
  facility: a building counts as "in outage" when its footprint centroid falls
  inside an offline switchboard's indicative radius.
- **Repair checklist tasks are a generic field workflow**, not sourced from
  any per-asset repair-procedure dataset — none exists publicly.
- Suburb locations are approximate centroids, not individual property
  locations.

## License / attribution

Underlying datasets are published by the City of Gold Coast under a Creative
Commons Attribution 3.0 licence via the ArcGIS Hub.
