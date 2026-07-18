const ZONING_URL =
  'https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/City_Plan_Version_9/FeatureServer';
const ZONING_LAYER_ID = 3;
const RESIDENTIAL_ZONES = [
  'Low density residential',
  'Medium density residential',
  'High density residential',
  'Rural residential',
];

const FLOOD_URL =
  'https://services-ap1.arcgis.com/lnVW0dLI3fvST2hd/arcgis/rest/services/Flood_Risk_Overlay_2024/FeatureServer';
const FLOOD_LAYER_ID = 35;

const SWITCHBOARD_URL =
  'https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Switchboard/FeatureServer';
const SWITCHBOARD_LAYER_ID = 0;

async function fetchAllFeatures(baseUrl, layerId, { outFields = '*', where = '1=1', geometry = true } = {}) {
  const all = [];
  let offset = 0;
  let debug = null;
  for (let i = 0; i < 50; i++) {
    const paramsObj = {
      where,
      outFields,
      returnGeometry: String(geometry),
      resultOffset: String(offset),
      resultRecordCount: '2000',
      f: 'geojson',
    };
    const params = new URLSearchParams(paramsObj);
    const url = `${baseUrl}/${layerId}/query?${params}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.error) throw new Error(JSON.stringify(json.error));
    const features = json.features || [];
    if (!debug) debug = { url, params: paramsObj, sample: features[0] || null };
    all.push(...features);
    offset += features.length;
    if (!json.properties?.exceededTransferLimit || features.length === 0) break;
  }
  return { features: all, debug };
}

export async function fetchZoning() {
  const where = RESIDENTIAL_ZONES.map((z) => `LVL1_ZONE = '${z}'`).join(' OR ');
  const { features, debug } = await fetchAllFeatures(ZONING_URL, ZONING_LAYER_ID, {
    outFields: 'LVL1_ZONE,ZONE_PRECINCT',
    where,
  });
  return {
    geojson: {
      type: 'FeatureCollection',
      features: features.map((f) => ({
        ...f,
        properties: {
          tier: f.properties.LVL1_ZONE,
          precinct: f.properties.ZONE_PRECINCT,
        },
      })),
    },
    debug,
  };
}

const RISK_WEIGHT = { 'Very High': 4, High: 3, Medium: 2, Low: 1, 'Maximum Regional Flood Extent': 0.5 };

export function normalizeSuburb(raw) {
  if (!raw) return null;
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function fetchFloodRiskBySuburb() {
  const paramsObj = {
    where: '1=1',
    groupByFieldsForStatistics: 'SUBURBS,flood_risk',
    outStatistics: JSON.stringify([
      { statisticType: 'sum', onStatisticField: 'Shape__Area', outStatisticFieldName: 'area' },
    ]),
    returnGeometry: 'false',
    f: 'json',
  };
  const params = new URLSearchParams(paramsObj);
  const url = `${FLOOD_URL}/${FLOOD_LAYER_ID}/query?${params}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  const debug = { url, params: paramsObj, sample: json.features?.[0]?.attributes || null };

  const bySuburb = {};
  const areaByCategory = {};
  json.features.forEach((f) => {
    const area = f.attributes.area || 0;
    areaByCategory[f.attributes.flood_risk] = (areaByCategory[f.attributes.flood_risk] || 0) + area;

    const key = normalizeSuburb(f.attributes.SUBURBS);
    if (!key) return;
    if (!bySuburb[key]) bySuburb[key] = { total: 0, weighted: 0, top: null, topArea: 0 };
    bySuburb[key].total += area;
    bySuburb[key].weighted += area * (RISK_WEIGHT[f.attributes.flood_risk] || 0);
    if (area > bySuburb[key].topArea) {
      bySuburb[key].topArea = area;
      bySuburb[key].top = f.attributes.flood_risk;
    }
  });

  const result = {};
  Object.entries(bySuburb).forEach(([key, v]) => {
    result[key] = {
      score: v.total > 0 ? Math.round((v.weighted / v.total / 4) * 100) : 0,
      dominant: v.top,
    };
  });

  const totalArea = Object.values(areaByCategory).reduce((s, a) => s + a, 0);
  const highRiskArea = (areaByCategory['High'] || 0) + (areaByCategory['Very High'] || 0);
  const citywide = {
    highRiskPct: totalArea > 0 ? Math.round((highRiskArea / totalArea) * 100) : 0,
  };

  return { bySuburb: result, citywide, debug };
}

export async function fetchSwitchboards() {
  const { features, debug } = await fetchAllFeatures(SWITCHBOARD_URL, SWITCHBOARD_LAYER_ID, {
    outFields: 'CLASS,GIS_USER_STATUS,GIS_OWNER',
  });
  return {
    geojson: {
      type: 'FeatureCollection',
      features: features.map((f) => ({
        ...f,
        properties: {
          class: f.properties.CLASS,
          status: f.properties.GIS_USER_STATUS,
          owner: f.properties.GIS_OWNER,
        },
      })),
    },
    debug,
  };
}

// The Switchboard layer has no SUBURBS attribute, unlike the flood risk layer —
// bucket each point to its nearest suburb centroid instead (same "approximate
// centroid" tradeoff already used for suburb markers elsewhere in the app).
export function nearestSuburb(lon, lat, suburbs) {
  let best = null;
  let bestDist = Infinity;
  for (const s of suburbs) {
    const d = (s.lon - lon) ** 2 + (s.lat - lat) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = s.name;
    }
  }
  return best;
}
