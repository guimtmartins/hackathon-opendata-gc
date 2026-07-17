# DataGap Gold Coast

React + Vite + Supabase web app built for the **Gold Coast Open Data Challenge 2026**
(Planning & Liveability track). It overlays three official City of Gold Coast
datasets — zoning, historical development approvals, and flood risk — on a
single interactive map, and cross-references them by suburb to expose where
development capacity, real development activity, and flood exposure line up
(or don't).

Beyond the mapping itself, the project's central argument is that this kind
of cross-referencing is harder than it should be because the underlying open
data is **fragmented and unevenly maintained**: two of the three layers are
live and current, the third has been frozen at its source since 2016. The
app surfaces that gap directly, with an API-call inspector so every number
shown can be traced back to its real source.

This is an evolution of the hackathon's original static prototype
(`DevelopmentWatch.html`, now deprecated and not part of this app) into a
proper client fed by live APIs and a managed database.

## Data sources

Only two data portals are used, per the challenge rules:

- `https://data-goldcoast.opendata.arcgis.com/` (City of Gold Coast ArcGIS Hub) — primary source
- `https://www.data.qld.gov.au/` (Queensland Government open data portal) — checked, no usable Gold Coast-level dataset found for this project

| Layer | Source | Live or static? | Detail |
|---|---|---|---|
| **Zoning** | ArcGIS `City_Plan_Version_9/FeatureServer`, layer 3 ("Zone") | **Live** — fetched from ArcGIS on every page load | Master zoning layer, 27,880 lots city-wide. Filtered client-side to the 4 residential categories (see below). Field `LVL1_ZONE` provides the category name directly, no code mapping needed. |
| **Flood risk** | ArcGIS `Flood_Risk_Overlay_2024/FeatureServer/35` | **Live** — aggregated server-side via ArcGIS `outStatistics`/`groupBy`, so the ~34k raw polygons are never downloaded to the browser | 2024 flood modeling, published Jan 2025. |
| **Development approvals** | Supabase table `development_applications`, seeded from ArcGIS's `Property_Development_Applications_and_Determinations` FeatureServer | **Static** — one-time extraction, not a live feed | Complete dataset: 80 suburbs, 23,678 records covering 2012-2016. The ArcGIS item's own metadata was last updated in April 2017 and was never refreshed since — this is the "data gap" the project's thesis is about. |

An earlier version of this project used a different zoning layer ("Residential
density", layer 49), which only covered about a third of residential lots
(2,512 of 7,860) and produced misleading counts. It was replaced with layer 3
("Zone"), which is the authoritative, complete layer.

### Zoning categories

The zoning layer is filtered to 4 residential categories, matching the
official Gold Coast City Plan zone codes:

- **Low density residential** — the zone code's stated purpose is to provide
  for standalone dwelling houses, supported by small-scale local services.
  This is the most common residential zoning in Gold Coast suburbs.
- **Medium density residential** — provides for a mix of dwelling types
  (houses alongside townhouses and small multi-unit buildings), still
  oriented around local services rather than large-scale development.
- **High density residential** — the zone for higher-intensity unit and
  apartment development, concentrated in and around activity centres and
  the coastal strip (e.g. Surfers Paradise, Broadbeach, Southport).
- **Rural residential** — large-lot, lower-intensity residential zoning on
  the urban fringe, generally without full reticulated services; residential
  use is limited to a single dwelling house per lot.

These are council-defined planning categories, not a measure of how built-up
a suburb currently is — a suburb can be zoned for high density and still have
very little of it actually built (that gap is exactly what the cross-analysis
panel is designed to surface).

## Architecture

```
src/
  App.jsx                    # orchestrates layersOn / sidebarCollapsed state
  App.css                    # dark theme — floating header (top) + floating sidebar (right) over a full-bleed map
  main.jsx
  lib/
    supabaseClient.js        # Supabase client; exports `supabase` and `supabaseUrl`
    arcgis.js                # live ArcGIS fetch helpers (zoning + flood), normalizeSuburb(), captures debug info per call
  hooks/
    useZoning.js              # zoning — LIVE, ArcGIS City Plan v9, layer 3 "Zone"
    useHistorical.js           # approvals — Supabase (development_applications)
    useFloodRisk.js             # flood risk — LIVE, ArcGIS, aggregated server-side
    useSuburbs.js                 # suburbs/centroids — Supabase (suburbs)
    useSuburbZoning.js             # zoning mix per suburb — Supabase (suburb_zoning)
  components/
    MapView.jsx                     # Leaflet map, the 3 layers + ResizeObserver (AutoInvalidateSize)
    Sidebar.jsx                      # side panel: layers + Analysis (cross-analysis, indicators, data sources)
    CrossView.jsx                     # zoning × approvals × flood risk cross-analysis table + automatic highlights
    ApiInspector.jsx                   # "View call" modal — shows the real URL/params/sample response, via createPortal
  data/densityColors.js                # shared zoning/risk colors and labels
supabase/
  schema.sql                             # full schema + seed with real data
```

Each of the three layers has its own hook and its own `debug` object
(URL, params, sample response) that feeds the "View call" button in the Data
sources panel — this is a deliberate transparency feature: every figure shown
in the UI should be traceable to the exact request that produced it. For the
approvals layer specifically, the inspector also shows the *original* ArcGIS
source it was extracted from, since the live request only ever hits Supabase.

There is no admin/upload feature in the app. An earlier version had a
Supabase-Auth-gated upload panel for council staff; it was removed by
request, since every future data update is expected to happen directly
through Supabase's own Table Editor (project-owner session, bypasses the
anon client's RLS entirely) rather than through app code.

## Supabase

Tables (all RLS-enabled, public read only — no write path through the app):

| Table | Rows | Contents |
|---|---|---|
| `suburbs` | 80 | Suburb name + lat/lon centroid, calculated from the official `Suburbs` boundary polygon |
| `development_applications` | 80 | Approval counts per suburb, 2012–2016 — full real dataset (see Data sources) |
| `suburb_zoning` | 154 | Zoning mix per suburb (lot count per category), pre-computed via spatial intersection between the `Zone` layer and suburb boundaries |
| `datasets_meta` | 3 | Label / reference period / freshness / source note per layer, editable without a redeploy |

## Running locally

1. Create a Supabase project (supabase.com → New Project; free tier is enough).
2. In the SQL Editor, run `supabase/schema.sql`. This creates all tables, RLS
   policies, and seeds the real data (suburbs, approvals, zoning mix, dataset metadata).
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

- **No write path through the app.** Any data update (e.g. a new approvals
  count) has to be made manually via the Supabase Table Editor, or through a
  future scheduled integration with the council's internal permitting system.
- **The approvals dataset cannot update itself.** Its ArcGIS source
  (`Property Development Applications and Determinations`) has been static
  since 2016/2017 — the dataset itself, not just our extraction of it. There
  is no automatic fix for this without the council either syncing that
  service to their internal system or publishing a live equivalent.
- **Suburb locations are approximate.** Map markers use suburb centroids, not
  individual property locations.
- Two ideas considered and intentionally *not* built, because no data exists
  for them on either authorized portal: (1) flood risk vs. property
  value/insurance cost, and (2) government dollars spent per suburb on flood
  mitigation. Both would require non-authorized third-party sources
  (real-estate portals, insurers) or a dataset the council doesn't publish
  (capital works exists as a dataset, but with no cost field at all).

## License / attribution

Underlying datasets are published by the City of Gold Coast under a Creative
Commons Attribution 3.0 licence via the ArcGIS Hub.
