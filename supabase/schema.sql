-- Switch Guard — Supabase schema
-- Run this in the SQL Editor of your Supabase project (Project > SQL Editor > New query).
--
-- The app's only Supabase-backed data is suburb centroids: every switchboard
-- and community building fetched live from ArcGIS is bucketed to its nearest
-- suburb centroid to borrow that suburb's flood-risk score. Everything else
-- (flood risk, switchboards, community buildings) is fetched live from
-- ArcGIS on every page load — there is no other table to seed.

-- ---------------------------------------------------------------------------
-- Suburbs (centroids) — calculated from the official polygon of the
-- "Suburbs" layer (ArcGIS Hub, City of Gold Coast).
-- ---------------------------------------------------------------------------
create table if not exists suburbs (
  id bigint generated always as identity primary key,
  name text not null unique,
  lat double precision not null,
  lon double precision not null
);

-- ---------------------------------------------------------------------------
-- Row Level Security: public read only — there is no write path through the
-- app. Any future edits are made through the Supabase Table Editor, which
-- uses the project owner's session and bypasses the anon client's RLS.
-- ---------------------------------------------------------------------------
alter table suburbs enable row level security;
create policy "public read suburbs" on suburbs for select using (true);

-- ---------------------------------------------------------------------------
-- Seed — every Gold Coast suburb centroid, calculated from the official
-- "Suburbs" boundary layer (ArcGIS Hub, City of Gold Coast).
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
