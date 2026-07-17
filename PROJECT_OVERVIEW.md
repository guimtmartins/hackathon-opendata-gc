# DataGap Gold Coast — What this project is and how it works

*A plain-language guide for anyone looking at this project for the first
time — no technical background needed.*

## The idea in one paragraph

DataGap Gold Coast puts three things about Gold Coast suburbs on one map at
the same time: **where you're allowed to build** (zoning), **where people
have actually built** (development approvals), and **where it's risky to
build** (flood risk). Looked at separately, each of these is already public
information. Looked at *together*, they tell a story none of them tells on
its own — and, as it turns out, the fact that it's hard to look at them
together is itself part of the story.

## The problem this project is pointing at

Gold Coast City Council already publishes a lot of open data. The problem
isn't a lack of data — it's that related pieces of it live in different
places, get updated on different schedules, and were never designed to be
compared side by side. This project picked three datasets that are directly
relevant to planning and safety, combined them, and — in doing so — ran
straight into that exact problem: one of the three datasets turned out to be
frozen since 2016, while the other two update live. That's not a
hypothetical example of the "data gap" — it's one we found while building
this.

## What you see on the map

### Layer 1 — Zoning (where building is allowed)

This shows every residential lot in Gold Coast, colour-coded by what the
council's City Plan allows to be built there:

- **Low density residential** — standalone houses. This is the zoning behind
  most typical Gold Coast suburban streets.
- **Medium density residential** — a mix of houses, townhouses, and small
  unit blocks.
- **High density residential** — apartment and unit towers. Concentrated
  around activity centres and the coastline (Surfers Paradise, Broadbeach,
  Southport, and similar areas).
- **Rural residential** — large blocks on the edge of the city, generally
  limited to one house per lot, with fewer services than urban areas.

Importantly, this is *permission*, not *reality*. A suburb zoned for high
density can still be made up mostly of low-rise buildings if nobody has
built up to that zoning yet — which is exactly what the next layer helps
reveal.

This layer is pulled live, on the spot, from the council's own public zoning
map every time the app is opened — nothing about it is hardcoded, so it
always reflects whatever the council currently has published.

### Layer 2 — Historical development approvals (where people have built)

This shows how many development applications (new houses, unit blocks,
subdivisions, and similar projects) were approved in each suburb. The bigger
the marker, the more approvals that suburb has had.

This is the one layer in the project that is **not live** — more on that
below, because it's actually one of the more interesting findings.

### Layer 3 — Flood risk (where it's risky to build)

This shows each suburb's flood risk, based on the council's 2024 flood
modeling, scored from 0 (no meaningful risk) to 100 (very high risk). This
layer also updates live from the council's data every time the app loads.

## The cross-analysis panel

Turning on all three layers at once is useful, but the real value is in the
side panel, which lines the three layers up **suburb by suburb** and
automatically calls out the most interesting patterns, for example:

- A suburb that leads the city in development approvals
- A suburb that combines high flood risk with a lot of recent approvals
  activity — i.e., a place where people are actively building despite the
  risk
- A suburb that's zoned for plenty of residential capacity but where
  relatively little of that capacity has actually been used

Below the highlights is a sortable table listing every suburb with its
approval count, flood risk score, and total zoned capacity side by side, plus
a small colour bar showing how that suburb's zoning is split across the four
categories above.

## City-wide indicators

A separate section boils the same data down into five simple, single-number
facts about the whole city — for example, what share of all zoned
residential land is zoned for high density, or how many suburbs combine
above-average development activity with high flood risk. Every one of these
numbers is calculated directly from the three datasets described above — none
of it comes from outside sources.

## The "Data sources" panel — and why it exists

This section exists to answer one question directly: **can I trust these
numbers, and where do they actually come from?**

For each of the three layers, it shows:
- How current the data is
- Whether it's a live connection to the council's systems or a fixed snapshot
- A **"View call"** button that opens the *exact* request the app made to
  fetch that data, along with a real sample of what came back — so nothing
  in this project is taking the app's word for it. Anyone can check the
  receipts.

This is also where the project's central finding is stated plainly: the
development approvals dataset hasn't been genuinely updated since 2016 —
about a decade of no refresh, even though the two other layers are perfectly
capable of updating live. That gap is not a flaw in this project; it's a
flaw in the underlying open data that this project makes visible.

## Where the data actually comes from

Everything in this project comes from one of two official sources, and
nothing else:

- **City of Gold Coast's public data catalog** (their ArcGIS Hub) — this is
  where the zoning map, the flood risk modeling, and the original
  development-approvals records all come from.
- **Queensland Government's open data portal** — checked as part of this
  project, but it didn't have any additional Gold Coast-specific data that
  fit here.

Two layers (zoning and flood risk) are read live from the council's systems
every time the app is opened. The third (development approvals) was
extracted once from the council's data and stored in a small database we
manage ourselves, because the council's own copy of that dataset stopped
being updated years ago — there was nothing live left to connect to.

## Why this matters

For a council considering how to prioritise planning and infrastructure
decisions, seeing zoning, real development activity, and flood risk on one
map — with suburb-level detail and full transparency about where every
number comes from — is a more useful starting point than three separate
reports. And the project's discovery that one of its own three data sources
is a decade out of date is a concrete, real example of exactly the kind of
open-data problem that makes city-wide planning harder than it needs to be.

## Honest limitations

- Suburb markers are approximate centre-points, not individual properties.
- The approvals numbers only cover 2012–2016 — they are real, but old, and
  can't currently be refreshed automatically (see above).
- Two additional analyses were considered during this project — comparing
  flood risk to property prices/insurance costs, and estimating how much the
  council spends per suburb on flood mitigation — and both were deliberately
  left out, because no data for them exists in either of the two official
  sources this project restricts itself to. Building them would have meant
  either guessing or pulling from unofficial sources, which this project
  intentionally avoids.
