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
