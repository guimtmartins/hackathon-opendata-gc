// Zoning layer is set aside for now (focus is on flood risk) — flip this
// back to true to restore the zoning UI and live fetch.
export const SHOW_ZONING = false;

// Reversible UI hides, same idea as SHOW_ZONING — flip back to true to restore.
// Underlying data still loads (Data sources still needs it), only the UI is hidden.
export const SHOW_HISTORICAL = false;
export const SHOW_CROSS_ANALYSIS = false;
export const SHOW_CITY_INDICATORS = false;

export const ZONE_COLORS = {
  'Low density residential': '#5DCAA5',
  'Medium density residential': '#F2A623',
  'High density residential': '#D85A30',
  'Rural residential': '#8A6D3B',
};

export const ZONE_LABELS = {
  'Low density residential': 'Low density',
  'Medium density residential': 'Medium density',
  'High density residential': 'High density',
  'Rural residential': 'Rural residential',
};

export const RISK_COLOR = {
  'Very High': '#D85A30',
  High: '#F2A623',
  Medium: '#E0C341',
  Low: '#5DCAA5',
  'Maximum Regional Flood Extent': '#8B8F97',
};

export const HIGH_RISK = ['High', 'Very High'];

// Switchboard size class (SIZE_M field) → marker radius in px and indicative
// coverage radius in metres. The metre values are nominal, for visualisation
// only: no electrical service-area data exists in any public dataset (the
// technical fields are null on all 4,119 records — verified via the live API).
export const SWITCHBOARD_MARKER_PX = { LARGE: 5, MEDIUM: 3.5, SMALL: 2.5, TBA: 2.5 };
export const SWITCHBOARD_RANGE_M = { LARGE: 600, MEDIUM: 300, SMALL: 150, TBA: 150 };

// Colour for switchboards taken offline by the outage simulation.
export const OFFLINE_COLOR = '#E5484D';

// Outage-simulation severity: each level takes the N most EXPOSED boards
// offline. Exposure is a deterministic ranking over real fields — critical
// boards (GCCC, three-phase) first, then higher suburb 2024 flood-risk score,
// then larger SIZE_M class. No randomness: the same boards fail every run.
export const SEVERITY_LEVELS = [
  { id: 'minor', label: 'Minor', count: 5, color: '#E0C341' },
  { id: 'moderate', label: 'Moderate', count: 10, color: '#F2A623' },
  { id: 'severe', label: 'Severe', count: 20, color: '#E5484D' },
];
export const severityLevel = (id) => SEVERITY_LEVELS.find((l) => l.id === id) || SEVERITY_LEVELS[1];

const SIZE_RANK = { LARGE: 3, MEDIUM: 2, SMALL: 1, TBA: 0 };
// Higher = more exposed. b: { critical, risk, size }.
export function exposureRank(b) {
  return (
    (b.critical ? 1e6 : 0) +
    (b.risk?.score ?? 0) * 100 +
    (SIZE_RANK[(b.size || 'TBA').toUpperCase()] || 0)
  );
}

// Focus mode: every map layer and analysis panel is limited to these suburbs
// (the Runaway Bay demo region). Reversible like the SHOW_* flags — set the
// list to [] to go back to city-wide. Data fetching is unchanged; this is a
// display filter only.
export const FOCUS_SUBURBS = [
  'Runaway Bay',
  'Hollywell',
  'Paradise Point',
  'Coombabah',
  'Biggera Waters',
  'Labrador',
  'Arundel',
  'South Stradbroke',
];
export const FOCUS_CENTER = [-27.91, 153.39];
export const FOCUS_ZOOM = 13;
// Envelope around the focus suburbs (lonMin,latMin,lonMax,latMax) — used to
// keep the community-buildings query small; results are still bucketed to a
// suburb and filtered by inFocus afterwards.
export const FOCUS_BBOX = '153.33,-27.98,153.44,-27.85';
export const inFocus = (name) => FOCUS_SUBURBS.length === 0 || FOCUS_SUBURBS.includes(name);
