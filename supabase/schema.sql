-- DataGap Gold Coast — Supabase schema
-- Run this in the SQL Editor of your Supabase project (Project > SQL Editor > New query).
--
-- This file reflects the actual state of the production database: 80 suburbs
-- and approval counts coming from the official "Property Development
-- Applications and Determinations" dataset (no longer the HTML prototype's
-- placeholder), with centroids calculated from the official "Suburbs"
-- boundary layer (both on the City of Gold Coast ArcGIS Hub). There is no
-- more council login/upload: data edits are done directly through the
-- Supabase Table Editor (project owner login).

-- ---------------------------------------------------------------------------
-- 1. Suburbs (centroids) — calculated from the official polygon of the
--    "Suburbs" layer (ArcGIS Hub, City of Gold Coast).
-- ---------------------------------------------------------------------------
create table if not exists suburbs (
  id bigint generated always as identity primary key,
  name text not null unique,
  lat double precision not null,
  lon double precision not null
);

-- ---------------------------------------------------------------------------
-- 2. Development approvals, aggregated by suburb. Complete dataset
--    (80 suburbs, 23,678 records 2012-2016) — updatable via Table Editor.
-- ---------------------------------------------------------------------------
create table if not exists development_applications (
  id bigint generated always as identity primary key,
  suburb_id bigint not null references suburbs(id) on delete cascade,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (suburb_id)
);

-- ---------------------------------------------------------------------------
-- 3. Provenance/vintage metadata for each layer — feeds the "Data sources"
--    panel on the front end. Keeping this in a table (instead of hardcoded
--    in the code) allows updating the displayed date without a new deploy.
-- ---------------------------------------------------------------------------
create table if not exists datasets_meta (
  layer_key text primary key,          -- 'zoning' | 'development_applications' | 'flood_risk'
  label text not null,
  reference_period text not null,      -- e.g. "2012-2016", "2024 (modeling)"
  last_updated_at timestamptz not null default now(),
  freshness text not null default 'amber', -- 'green' | 'amber' | 'red'
  source_note text
);

-- ---------------------------------------------------------------------------
-- 4. Residential zoning mix per suburb — pre-computed via spatial
--    intersection between the "Zone" layer (City Plan v9, layer 3) and the
--    official suburb boundaries (the "Suburbs" layer). Feeds the
--    "Cross-analysis by suburb" panel without redoing the intersection client-side.
-- ---------------------------------------------------------------------------
create table if not exists suburb_zoning (
  suburb_id bigint not null references suburbs(id) on delete cascade,
  tier text not null,
  count integer not null default 0,
  primary key (suburb_id, tier)
);

-- ---------------------------------------------------------------------------
-- Row Level Security: public read on everything. There is no more write
-- access through the app (no council login) — future edits are made through
-- the Supabase Table Editor, which uses the project owner's session and
-- bypasses the anon client's RLS.
-- ---------------------------------------------------------------------------
alter table suburbs enable row level security;
alter table development_applications enable row level security;
alter table datasets_meta enable row level security;
alter table suburb_zoning enable row level security;

create policy "public read suburbs" on suburbs for select using (true);
create policy "public read dev apps" on development_applications for select using (true);
create policy "public read datasets_meta" on datasets_meta for select using (true);
create policy "public read suburb_zoning" on suburb_zoning for select using (true);

-- ---------------------------------------------------------------------------
-- Seed — real dataset extracted from the ArcGIS Hub (see section 3 of the
-- project handoff for the per-suburb aggregation methodology).
-- ---------------------------------------------------------------------------
insert into suburbs (name, lat, lon) values
  ('Pimpama', -27.812873389298662, 153.31476619010726),
  ('Coomera', -27.846952139093126, 153.33950219703993),
  ('Upper Coomera', -27.876838637074332, 153.28589952014318),
  ('Hope Island', -27.868160547789167, 153.35993485230046),
  ('Southport', -27.973063382976154, 153.40175703391247),
  ('Surfers Paradise', -28.00164836855691, 153.4229379052119),
  ('Broadbeach Waters', -28.026987281919908, 153.41492112523983),
  ('Palm Beach', -28.115949443302785, 153.46307797127096),
  ('Helensvale', -27.901031135087724, 153.33833475374544),
  ('Maudsland', -27.933866540183153, 153.27885255779088),
  ('Robina', -28.070774524107833, 153.39318814472455),
  ('Reedy Creek', -28.112454550806838, 153.39635819236548),
  ('Mermaid Waters', -28.049816759025884, 153.4214059481498),
  ('Oxenford', -27.905694057011143, 153.3029184973435),
  ('Ormeau Hills', -27.79889895030218, 153.23404023089353),
  ('Elanora', -28.135820837643234, 153.44917358261668),
  ('Willow Vale', -27.845060377716532, 153.2630674779995),
  ('Ormeau', -27.77560388263298, 153.25307016196956),
  ('Carrara', -28.02056308823158, 153.36636225228682),
  ('Nerang', -27.981048983865627, 153.31227775521074),
  ('Burleigh Heads', -28.104952004800758, 153.43299995908075),
  ('Mudgeeraba', -28.093699786448553, 153.34901153025368),
  ('Labrador', -27.94620507173079, 153.39976234754337),
  ('Burleigh Waters', -28.087320105695206, 153.43220598464794),
  ('Biggera Waters', -27.93008500579672, 153.39413927139265),
  ('Benowa', -28.007689238513922, 153.38583057661762),
  ('Bundall', -28.0110341211352, 153.4048862291337),
  ('Paradise Point', -27.879655781837524, 153.39732290771124),
  ('Mermaid Beach', -28.047982508987793, 153.4366450268031),
  ('Pacific Pines', -27.940039495563543, 153.31440811825993),
  ('Ashmore', -27.988760819653855, 153.3764073659329),
  ('Currumbin Waters', -28.154132086247095, 153.46275055276308),
  ('Runaway Bay', -27.913585469411917, 153.40100892257556),
  ('Gilston', -28.0295831868964, 153.304691336557),
  ('Coolangatta', -28.16995898592558, 153.5333353427531),
  ('Worongary', -28.04074488369947, 153.3374050855534),
  ('Tallai', -28.06425707156688, 153.3262832945576),
  ('Bonogin', -28.139060086782145, 153.3533743009615),
  ('Arundel', -27.938690018292395, 153.36208056146194),
  ('Yatala', -27.753891054739334, 153.21697364061083),
  ('Tallebudgera', -28.151655801899583, 153.4194661763554),
  ('Broadbeach', -28.027530591423332, 153.43130420262273),
  ('Miami', -28.06818361346333, 153.43579020149411),
  ('Tugun', -28.148649723855506, 153.4904051637236),
  ('Varsity Lakes', -28.088857255093398, 153.41100345886412),
  ('Jacobs Well', -27.7862171695797, 153.35953972607714),
  ('Molendinar', -27.97400326637869, 153.36068350680165),
  ('Currumbin', -28.136626729136488, 153.48294569261412),
  ('Parkwood', -27.95436108562374, 153.36452410543612),
  ('Coombabah', -27.909744763409797, 153.36974174446266),
  ('Wongawallan', -27.887614620470174, 153.2345548951221),
  ('Currumbin Valley', -28.208016299812087, 153.39421049027865),
  ('Main Beach', -27.952565074226737, 153.42279121478543),
  ('Clear Island Waters', -28.04196652348167, 153.3972027641076),
  ('Highland Park', -28.014170605858514, 153.33205569029082),
  ('Luscombe', -27.79072412702228, 153.2017792686753),
  ('Hollywell', -27.89528913690766, 153.39952065460372),
  ('Merrimac', -28.050145658565615, 153.3726778873766),
  ('Stapylton', -27.730670320501307, 153.24449699700196),
  ('Gaven', -27.955923174836556, 153.33522330766542),
  ('Mount Nathan', -27.982749941999085, 153.26864359895157),
  ('Bilinga', -28.1607003549676, 153.5070662724243),
  ('Kingsholme', -27.825606066207726, 153.23276202198224),
  ('Guanaba', -27.937694775651135, 153.2392171191963),
  ('Alberton', -27.70742783579262, 153.2695451080321),
  ('Tallebudgera Valley', -28.1893163251463, 153.35713523409095),
  ('Advancetown', -28.072212972178487, 153.2767818705127),
  ('Springbrook', -28.18757351053995, 153.27576491223118),
  ('Lower Beechmont', -28.050508746524454, 153.23788456010953),
  ('Clagiraba', -27.993199817746657, 153.2422726696686),
  ('South Stradbroke', -27.843114799273316, 153.4232501173448),
  ('Steiglitz', -27.739146935669545, 153.3442212877136),
  ('Austinville', -28.15677353127523, 153.31049018872574),
  ('Numinbah Valley', -28.14523316842191, 153.23456507732854),
  ('Cedar Creek', -27.85027534024897, 153.19644931238312),
  ('Norwell', -27.775703628606113, 153.30750140216955),
  ('Neranwood', -28.120777597612346, 153.3072479690749),
  ('Woongoolba', -27.7297942043312, 153.32060619885317),
  ('Gilberton', -27.74201928983254, 153.2729860881197),
  ('Natural Bridge', -28.221747493101727, 153.22287902910693)
on conflict (name) do nothing;

insert into development_applications (suburb_id, count)
select s.id, v.count from suburbs s
join (values
  ('Pimpama', 4845),
  ('Coomera', 1403),
  ('Upper Coomera', 1083),
  ('Hope Island', 1003),
  ('Southport', 976),
  ('Surfers Paradise', 863),
  ('Broadbeach Waters', 678),
  ('Palm Beach', 531),
  ('Helensvale', 509),
  ('Maudsland', 478),
  ('Robina', 432),
  ('Reedy Creek', 412),
  ('Mermaid Waters', 372),
  ('Oxenford', 371),
  ('Ormeau Hills', 355),
  ('Elanora', 351),
  ('Willow Vale', 347),
  ('Ormeau', 345),
  ('Carrara', 344),
  ('Nerang', 338),
  ('Burleigh Heads', 327),
  ('Mudgeeraba', 305),
  ('Labrador', 301),
  ('Burleigh Waters', 297),
  ('Biggera Waters', 294),
  ('Benowa', 292),
  ('Bundall', 284),
  ('Paradise Point', 283),
  ('Mermaid Beach', 260),
  ('Pacific Pines', 252),
  ('Ashmore', 237),
  ('Currumbin Waters', 232),
  ('Runaway Bay', 219),
  ('Gilston', 212),
  ('Coolangatta', 207),
  ('Worongary', 200),
  ('Tallai', 194),
  ('Bonogin', 192),
  ('Arundel', 190),
  ('Yatala', 187),
  ('Tallebudgera', 185),
  ('Broadbeach', 183),
  ('Miami', 176),
  ('Tugun', 167),
  ('Varsity Lakes', 161),
  ('Jacobs Well', 159),
  ('Molendinar', 126),
  ('Currumbin', 120),
  ('Parkwood', 115),
  ('Coombabah', 96),
  ('Wongawallan', 86),
  ('Currumbin Valley', 84),
  ('Main Beach', 79),
  ('Clear Island Waters', 76),
  ('Highland Park', 74),
  ('Luscombe', 64),
  ('Hollywell', 63),
  ('Merrimac', 61),
  ('Stapylton', 61),
  ('Gaven', 60),
  ('Mount Nathan', 55),
  ('Bilinga', 45),
  ('Kingsholme', 45),
  ('Guanaba', 44),
  ('Alberton', 43),
  ('Tallebudgera Valley', 42),
  ('Advancetown', 37),
  ('Springbrook', 33),
  ('Lower Beechmont', 30),
  ('Clagiraba', 22),
  ('South Stradbroke', 16),
  ('Steiglitz', 14),
  ('Austinville', 12),
  ('Numinbah Valley', 10),
  ('Cedar Creek', 10),
  ('Norwell', 8),
  ('Neranwood', 6),
  ('Woongoolba', 4),
  ('Gilberton', 4),
  ('Natural Bridge', 1)
) as v(name, count) on v.name = s.name
on conflict (suburb_id) do nothing;

insert into suburb_zoning (suburb_id, tier, count)
select s.id, v.tier, v.count from suburbs s
join (values
  ('Pimpama', 'Low density residential', 1),
  ('Pimpama', 'Medium density residential', 339),
  ('Pimpama', 'Rural residential', 21),
  ('Coomera', 'Low density residential', 46),
  ('Coomera', 'Medium density residential', 200),
  ('Coomera', 'High density residential', 8),
  ('Coomera', 'Rural residential', 1),
  ('Upper Coomera', 'Low density residential', 170),
  ('Upper Coomera', 'Medium density residential', 315),
  ('Upper Coomera', 'Rural residential', 30),
  ('Hope Island', 'Low density residential', 43),
  ('Hope Island', 'Medium density residential', 33),
  ('Hope Island', 'Rural residential', 2),
  ('Southport', 'Low density residential', 159),
  ('Southport', 'Medium density residential', 95),
  ('Surfers Paradise', 'Low density residential', 39),
  ('Surfers Paradise', 'Medium density residential', 30),
  ('Surfers Paradise', 'High density residential', 89),
  ('Broadbeach Waters', 'Low density residential', 82),
  ('Broadbeach Waters', 'Medium density residential', 7),
  ('Palm Beach', 'Low density residential', 84),
  ('Palm Beach', 'Medium density residential', 111),
  ('Helensvale', 'Low density residential', 271),
  ('Helensvale', 'Medium density residential', 43),
  ('Maudsland', 'Low density residential', 180),
  ('Maudsland', 'Medium density residential', 5),
  ('Maudsland', 'Rural residential', 40),
  ('Robina', 'Low density residential', 259),
  ('Robina', 'Medium density residential', 71),
  ('Reedy Creek', 'Low density residential', 163),
  ('Reedy Creek', 'Medium density residential', 11),
  ('Reedy Creek', 'Rural residential', 18),
  ('Mermaid Waters', 'Low density residential', 111),
  ('Mermaid Waters', 'Medium density residential', 34),
  ('Oxenford', 'Low density residential', 218),
  ('Oxenford', 'Medium density residential', 27),
  ('Oxenford', 'Rural residential', 21),
  ('Ormeau Hills', 'Low density residential', 75),
  ('Ormeau Hills', 'Rural residential', 3),
  ('Elanora', 'Low density residential', 125),
  ('Elanora', 'Medium density residential', 18),
  ('Elanora', 'Rural residential', 19),
  ('Willow Vale', 'Medium density residential', 23),
  ('Willow Vale', 'Rural residential', 7),
  ('Ormeau', 'Low density residential', 210),
  ('Ormeau', 'Medium density residential', 2),
  ('Ormeau', 'Rural residential', 34),
  ('Carrara', 'Low density residential', 120),
  ('Carrara', 'Medium density residential', 11),
  ('Carrara', 'Rural residential', 6),
  ('Nerang', 'Low density residential', 156),
  ('Nerang', 'Medium density residential', 34),
  ('Nerang', 'Rural residential', 73),
  ('Burleigh Heads', 'Low density residential', 106),
  ('Burleigh Heads', 'Medium density residential', 46),
  ('Burleigh Heads', 'High density residential', 5),
  ('Burleigh Heads', 'Rural residential', 2),
  ('Mudgeeraba', 'Low density residential', 140),
  ('Mudgeeraba', 'Medium density residential', 18),
  ('Mudgeeraba', 'Rural residential', 59),
  ('Labrador', 'Low density residential', 47),
  ('Labrador', 'Medium density residential', 108),
  ('Labrador', 'High density residential', 7),
  ('Burleigh Waters', 'Low density residential', 157),
  ('Burleigh Waters', 'Medium density residential', 29),
  ('Biggera Waters', 'Low density residential', 16),
  ('Biggera Waters', 'Medium density residential', 54),
  ('Benowa', 'Low density residential', 55),
  ('Benowa', 'Medium density residential', 11),
  ('Bundall', 'Low density residential', 36),
  ('Bundall', 'Medium density residential', 3),
  ('Paradise Point', 'Low density residential', 42),
  ('Paradise Point', 'Medium density residential', 33),
  ('Mermaid Beach', 'Low density residential', 3),
  ('Mermaid Beach', 'Medium density residential', 83),
  ('Mermaid Beach', 'High density residential', 2),
  ('Pacific Pines', 'Low density residential', 5),
  ('Pacific Pines', 'Medium density residential', 321),
  ('Pacific Pines', 'Rural residential', 9),
  ('Ashmore', 'Low density residential', 131),
  ('Ashmore', 'Medium density residential', 23),
  ('Currumbin Waters', 'Low density residential', 104),
  ('Currumbin Waters', 'Medium density residential', 20),
  ('Currumbin Waters', 'Rural residential', 19),
  ('Runaway Bay', 'Low density residential', 54),
  ('Runaway Bay', 'Medium density residential', 31),
  ('Gilston', 'Low density residential', 73),
  ('Gilston', 'Rural residential', 11),
  ('Coolangatta', 'Low density residential', 13),
  ('Coolangatta', 'Medium density residential', 32),
  ('Coolangatta', 'High density residential', 6),
  ('Worongary', 'Low density residential', 43),
  ('Worongary', 'Rural residential', 32),
  ('Tallai', 'Low density residential', 19),
  ('Tallai', 'Medium density residential', 1),
  ('Tallai', 'Rural residential', 27),
  ('Bonogin', 'Low density residential', 22),
  ('Bonogin', 'Rural residential', 104),
  ('Arundel', 'Low density residential', 150),
  ('Arundel', 'Medium density residential', 20),
  ('Yatala', 'Rural residential', 30),
  ('Tallebudgera', 'Low density residential', 3),
  ('Tallebudgera', 'Rural residential', 42),
  ('Broadbeach', 'Medium density residential', 1),
  ('Broadbeach', 'High density residential', 35),
  ('Miami', 'Low density residential', 26),
  ('Miami', 'Medium density residential', 48),
  ('Miami', 'High density residential', 1),
  ('Tugun', 'Low density residential', 41),
  ('Tugun', 'Medium density residential', 59),
  ('Varsity Lakes', 'Low density residential', 69),
  ('Varsity Lakes', 'Medium density residential', 169),
  ('Jacobs Well', 'Low density residential', 12),
  ('Jacobs Well', 'Medium density residential', 10),
  ('Molendinar', 'Low density residential', 94),
  ('Molendinar', 'Medium density residential', 1),
  ('Molendinar', 'Rural residential', 8),
  ('Currumbin', 'Low density residential', 34),
  ('Currumbin', 'Medium density residential', 20),
  ('Parkwood', 'Low density residential', 106),
  ('Parkwood', 'Rural residential', 14),
  ('Coombabah', 'Low density residential', 57),
  ('Coombabah', 'Medium density residential', 42),
  ('Wongawallan', 'Low density residential', 1),
  ('Currumbin Valley', 'Rural residential', 17),
  ('Main Beach', 'Medium density residential', 15),
  ('Main Beach', 'High density residential', 20),
  ('Clear Island Waters', 'Low density residential', 45),
  ('Clear Island Waters', 'Medium density residential', 5),
  ('Highland Park', 'Low density residential', 74),
  ('Highland Park', 'Medium density residential', 3),
  ('Highland Park', 'Rural residential', 8),
  ('Luscombe', 'Rural residential', 1),
  ('Hollywell', 'Low density residential', 26),
  ('Hollywell', 'Medium density residential', 9),
  ('Merrimac', 'Low density residential', 67),
  ('Merrimac', 'Medium density residential', 30),
  ('Merrimac', 'High density residential', 1),
  ('Merrimac', 'Rural residential', 1),
  ('Stapylton', 'Medium density residential', 1),
  ('Stapylton', 'Rural residential', 4),
  ('Gaven', 'Low density residential', 1),
  ('Gaven', 'Medium density residential', 3),
  ('Gaven', 'Rural residential', 37),
  ('Mount Nathan', 'Rural residential', 41),
  ('Bilinga', 'Low density residential', 7),
  ('Bilinga', 'Medium density residential', 14),
  ('Kingsholme', 'Rural residential', 7),
  ('Guanaba', 'Rural residential', 1),
  ('Alberton', 'Rural residential', 4),
  ('Tallebudgera Valley', 'Rural residential', 25),
  ('Advancetown', 'Rural residential', 10),
  ('Clagiraba', 'Rural residential', 1),
  ('Norwell', 'Low density residential', 1)
) as v(name, tier, count) on v.name = s.name
on conflict (suburb_id, tier) do nothing;

insert into datasets_meta (layer_key, label, reference_period, freshness, source_note) values
  ('zoning', 'Zoning — City Plan v9', '2022', 'amber', 'City Plan v9, master "Zone" layer (layer 3, 27,880 lots, covers 100% of the council area). Filtered to the 4 residential categories (low/medium/high density + rural residential).'),
  ('development_applications', 'Development approvals', '2012-2016', 'red', 'Property Development Applications and Determinations (City of Gold Coast ArcGIS Hub). Complete dataset: 80 suburbs, 23,678 records 2012-2016. Centroids from the official Suburbs boundary layer.'),
  ('flood_risk', 'Flood risk', '2024 (modeling)', 'green', 'Flood Risk Overlay, published Jan/2025. Fetched live from ArcGIS.')
on conflict (layer_key) do nothing;
