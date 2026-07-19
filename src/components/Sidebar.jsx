import { useState } from 'react';
import {
  HIGH_RISK,
  SHOW_ZONING,
  SHOW_CROSS_ANALYSIS,
  SHOW_CITY_INDICATORS,
  inFocus,
} from '../data/densityColors';
import { normalizeSuburb } from '../lib/arcgis';
import CrossView from './CrossView';
import PriorityActions from './PriorityActions';
import StormWatch from './StormWatch';
import ApiInspector from './ApiInspector';

const INSPECTOR_TITLES = {
  zoning: 'Zoning — API call',
  historical: 'Development approvals — API call',
  flood: 'Flood risk — API call',
  switchboards: 'Electrical switchboards — API call',
  rain: 'Rain forecast — API call',
  buildings: 'Community buildings — API call',
};

function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`accordion ${open ? 'open' : ''}`}>
      <div className="accordion-head" onClick={() => setOpen((o) => !o)}>
        <div className="title">{title}</div>
        <div className="chevron">▾</div>
      </div>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  );
}

export default function Sidebar({
  zoning,
  historical,
  flood,
  suburbs,
  suburbZoning,
  switchboards,
  switchboardsWithRisk,
  communityBuildings,
  rain,
  meta,
  historicalDebug,
}) {
  const zoneCounts = {};
  (zoning.data?.features || []).forEach((f) => {
    const t = f.properties.tier;
    zoneCounts[t] = (zoneCounts[t] || 0) + 1;
  });
  const totalZoned = zoning.data?.features.length || 0;
  const highDensityPct = totalZoned
    ? Math.round(((zoneCounts['High density residential'] || 0) / totalZoned) * 1000) / 10
    : null;

  const topHistorical = [...historical].sort((a, b) => b.count - a.count).slice(0, 8);
  const topApprovalSuburb = topHistorical[0];

  const counts = [...historical.map((h) => h.count)].sort((a, b) => a - b);
  const medianCount = counts[Math.floor(counts.length / 2)] || 0;
  const riskyActiveSuburbs = historical.filter((h) => {
    const risk = flood.bySuburb[normalizeSuburb(h.suburb)];
    return risk && HIGH_RISK.includes(risk.dominant) && h.count >= medianCount;
  });

  let totalZonedInSuburbs = 0;
  let riskyZonedLots = 0;
  Object.entries(suburbZoning.bySuburb).forEach(([name, mix]) => {
    const total = Object.values(mix).reduce((s, n) => s + n, 0);
    totalZonedInSuburbs += total;
    const risk = flood.bySuburb[normalizeSuburb(name)];
    if (risk && HIGH_RISK.includes(risk.dominant)) riskyZonedLots += total;
  });
  const riskyZonedPct = totalZonedInSuburbs ? Math.round((riskyZonedLots / totalZonedInSuburbs) * 100) : null;

  // "critical" is a proxy, not a certification: GCCC-owned three-phase switchboards are the only
  // combination the dataset can actually support (TRAFFIC_CONTROL, GENSET_CONNECTION and
  // CURRENT_RATING are null on all 4,119 records — verified via the live API, not assumed).
  const switchboardsBySuburb = {};
  const criticalSwitchboardsBySuburb = {};
  switchboardsWithRisk.forEach(({ suburb, critical }) => {
    switchboardsBySuburb[suburb] = (switchboardsBySuburb[suburb] || 0) + 1;
    if (critical) criticalSwitchboardsBySuburb[suburb] = (criticalSwitchboardsBySuburb[suburb] || 0) + 1;
  });
  const totalSwitchboards = switchboardsWithRisk.length;
  const riskySwitchboardCount = switchboardsWithRisk.filter(
    ({ risk }) => risk && HIGH_RISK.includes(risk.dominant)
  ).length;
  const riskySwitchboardPct = totalSwitchboards ? Math.round((riskySwitchboardCount / totalSwitchboards) * 100) : null;

  

  const [inspecting, setInspecting] = useState(null);
  const debugByLayer = {
    zoning: zoning.debug,
    historical: historicalDebug,
    flood: flood.debug,
    switchboards: switchboards.debug,
    rain: rain.debug,
    buildings: communityBuildings.debug,
  };

  return (
    <div id="sidebar">
      <div className="section-label">Analysis</div>

      <Accordion title="Storm Watch" defaultOpen>
        <StormWatch suburbs={suburbs.filter((s) => inFocus(s.name))} flood={flood} rain={rain} />
      </Accordion>

      <Accordion title="Priority action list" defaultOpen>
        <PriorityActions
          suburbs={suburbs.filter((s) => inFocus(s.name))}
          flood={flood}
          criticalBySuburb={criticalSwitchboardsBySuburb}
          totalBySuburb={switchboardsBySuburb}
        />
      </Accordion>

      {SHOW_CROSS_ANALYSIS && (
        <Accordion title="Cross-analysis by suburb">
          <CrossView
            suburbs={suburbs}
            historical={historical}
            flood={flood}
            suburbZoning={suburbZoning}
            switchboardsBySuburb={switchboardsBySuburb}
          />
        </Accordion>
      )}

      {SHOW_CITY_INDICATORS && (
        <Accordion title="City indicators">
          {SHOW_ZONING && (
            <div className="stat-card">
              <div className="num" style={{ color: 'var(--accent)' }}>
                {highDensityPct !== null ? `${highDensityPct.toLocaleString('en-AU')}%` : '—'}
              </div>
              <div className="label">The proportion of mapped residential lots that are zoned for high density.</div>
              <div className="stat-source">Source: City Plan v9, ArcGIS (live)</div>
            </div>
          )}
          <div className="stat-card">
            <div className="num" style={{ color: 'var(--accent)' }}>
              {topApprovalSuburb ? topApprovalSuburb.count.toLocaleString('en-AU') : '—'}
            </div>
            <div className="label">
              The number of approvals in {topApprovalSuburb?.suburb || '—'}, the leading suburb in the{' '}
              {meta.devApps?.reference_period || '2012–2016'} period.
            </div>
            <div className="stat-source">Source: Property Development Applications, Supabase</div>
          </div>
          <div className="stat-card">
            <div className="num" style={{ color: 'var(--accent)' }}>
              {flood.citywide ? `${flood.citywide.highRiskPct}%` : '—'}
            </div>
            <div className="label">The share of mapped area in the Flood Risk Overlay classified as High or Very High risk.</div>
            <div className="stat-source">Source: Flood Risk Overlay 2024, ArcGIS (live)</div>
          </div>
          <div className="stat-card" style={SHOW_ZONING ? undefined : { marginBottom: 0 }}>
            <div className="num" style={{ color: 'var(--accent)' }}>
              {riskyActiveSuburbs.length}<span style={{ fontSize: 14, color: 'var(--text-dim)' }}> / {historical.length}</span>
            </div>
            <div className="label">The number of suburbs with above-median approvals in a High or Very High risk area.</div>
            <div className="stat-source">Source: Property Development Applications (Supabase) × Flood Risk Overlay (ArcGIS)</div>
          </div>
          {SHOW_ZONING && (
            <div className="stat-card">
              <div className="num" style={{ color: 'var(--accent)' }}>
                {riskyZonedPct !== null ? `${riskyZonedPct}%` : '—'}
              </div>
              <div className="label">The share of zoned lots, among the analyzed suburbs, that fall in a High or Very High risk area.</div>
              <div className="stat-source">Source: City Plan v9 × Flood Risk Overlay, ArcGIS (live)</div>
            </div>
          )}
          <div className="stat-card" style={{ marginBottom: 0 }}>
            <div className="num" style={{ color: 'var(--accent)' }}>
              {riskySwitchboardPct !== null ? `${riskySwitchboardPct}%` : '—'}
            </div>
            <div className="label">The share of mapped switchboards that sit in a suburb with High or Very High flood risk.</div>
            <div className="stat-source">Source: Switchboard (ArcGIS, live) × Flood Risk Overlay (ArcGIS, live)</div>
          </div>
        </Accordion>
      )}

      <Accordion title="Data sources">
        {SHOW_ZONING && (
          <div className="vintage-row">
            <div className="vintage-dot amber" />
            <div className="info">
              <b>Zoning — City Plan v9</b>
              <span>2022 reference · fetched live from ArcGIS</span>
            </div>
            <button
              className="api-inspect-btn"
              disabled={!debugByLayer.zoning}
              onClick={() => setInspecting('zoning')}
            >
              View call
            </button>
          </div>
        )}
        {/* Development approvals removed from Data sources */}
        <div className="vintage-row">
          <div className="vintage-dot green" />
          <div className="info">
            <b>Flood risk</b>
            <span>2024 modeling · fetched live from ArcGIS</span>
          </div>
          <button
            className="api-inspect-btn"
            disabled={!debugByLayer.flood}
            onClick={() => setInspecting('flood')}
          >
            View call
          </button>
        </div>
        <div className="vintage-row">
          <div className="vintage-dot amber" />
          <div className="info">
            <b>Electrical switchboards</b>
            <span>Suburb bucketed by nearest centroid · fetched live from ArcGIS</span>
          </div>
          <button
            className="api-inspect-btn"
            disabled={!debugByLayer.switchboards}
            onClick={() => setInspecting('switchboards')}
          >
            View call
          </button>
        </div>
        <div className="vintage-row">
          <div className="vintage-dot green" />
          <div className="info">
            <b>Community buildings</b>
            <span>Council facilities (Buildings_FL) · fetched live from ArcGIS</span>
          </div>
          <button
            className="api-inspect-btn"
            disabled={!debugByLayer.buildings}
            onClick={() => setInspecting('buildings')}
          >
            View call
          </button>
        </div>
        <div className="vintage-row">
          <div className="vintage-dot amber" />
          <div className="info">
            <b>
              Population{' '}
              <span className="badge" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>
                external source
              </span>
            </b>
            <span>ABS Census 2021 QuickStats, per suburb · static (see src/data/population.js)</span>
          </div>
        </div>
        <div className="vintage-row">
          <div className="vintage-dot amber" />
          <div className="info">
            <b>
              Rain forecast{' '}
              <span className="badge" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>
                external source
              </span>
            </b>
            <span>Open-Meteo, not one of the two official portals · fetched live</span>
          </div>
          <button
            className="api-inspect-btn"
            disabled={!debugByLayer.rain}
            onClick={() => setInspecting('rain')}
          >
            View call
          </button>
        </div>
      </Accordion>

      {inspecting && (
        <ApiInspector
          title={INSPECTOR_TITLES[inspecting]}
          debug={debugByLayer[inspecting]}
          onClose={() => setInspecting(null)}
        />
      )}
    </div>
  );
}
