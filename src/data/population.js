// ABS Census 2021 usual resident population per focus suburb.
// EXTERNAL SOURCE (same standing as the Open-Meteo rain forecast): the two
// official portals publish no population data at suburb level — verified — so
// these come from ABS QuickStats (abs.gov.au), fetched 2026-07-18.
// SAL (suburb) figures where published; Arundel, Coombabah and Biggera Waters
// are their same-named single-suburb SA2s.
export const POPULATION_2021 = {
  'Runaway Bay': 9308,
  Hollywell: 2930,
  'Paradise Point': 7062,
  Labrador: 18643,
  'South Stradbroke': 142,
  Arundel: 11171,
  Coombabah: 10298,
  'Biggera Waters': 9973,
};

// Impact-model assumptions — stated in the UI, editable here.
// Household size: ABS 2021 Gold Coast average. Cost: rounded from the AER
// Value of Customer Reliability 2019 (residential ≈ A$25.95/kWh unserved,
// ~1.5 kW average household load → ≈ A$40 per household-hour).
export const AVG_HOUSEHOLD_SIZE = 2.3;
export const OUTAGE_COST_PER_HOUSEHOLD_HOUR_AUD = 40;
