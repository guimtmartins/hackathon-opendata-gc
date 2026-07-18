// Rain forecast — the only external (non-official-portal) data source in this app.
// Neither the City of Gold Coast ArcGIS Hub nor data.qld.gov.au publishes a live/forecast
// weather feed (checked before adding this). Open-Meteo is free, keyless, and supports
// batching every suburb centroid into a single request.
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

export async function fetchRainForecast(suburbs) {
  const paramsObj = {
    latitude: suburbs.map((s) => s.lat).join(','),
    longitude: suburbs.map((s) => s.lon).join(','),
    daily: 'precipitation_probability_max,precipitation_sum',
    forecast_days: '2',
    timezone: 'Australia/Brisbane',
  };
  const params = new URLSearchParams(paramsObj);
  const url = `${WEATHER_URL}?${params}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.reason || 'Open-Meteo request failed');
  const debug = { url, params: paramsObj, sample: json[0] || null };

  const bySuburb = {};
  suburbs.forEach((s, i) => {
    const loc = json[i];
    if (!loc?.daily) return;
    bySuburb[s.name] = {
      maxProbability: Math.max(...loc.daily.precipitation_probability_max),
      maxPrecipMm: Math.max(...loc.daily.precipitation_sum),
      days: loc.daily.time,
    };
  });

  return { bySuburb, debug };
}
