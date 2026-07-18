import { useState } from 'react';
import {
  ZONE_COLORS,
  ZONE_LABELS,
  RISK_COLOR,
  HIGH_RISK,
  SHOW_ZONING,
  SHOW_HISTORICAL,
  SHOW_CROSS_ANALYSIS,
  SHOW_CITY_INDICATORS,
} from '../data/densityColors';
import { normalizeSuburb, nearestSuburb } from '../lib/arcgis';
import CrossView from './CrossView';
import PriorityActions from './PriorityActions';
import ApiInspector from './ApiInspector';

const INSPECTOR_TITLES = {
  zoning: 'Zoning — API call',
  historical: 'Development approvals — API call',
  flood: 'Flood risk — API call',
  switchboards: 'Electrical switchboards — API call',
};

function LayerIcon({ color, bg, path }) {
  return (
    <div className="layer-icon" style={{ '--icon-bg': bg, '--icon-color': color }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {path}
      </svg>
    </div>
  );
}

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

const ZONE_ORDER = [
  'High density residential',
  'Medium density residential',
  'Low density residential',
  'Rural residential',
];

export default function Sidebar({
  zoning,
  historical,
  flood,
  suburbs,
  suburbZoning,
  switchboards,
  switchboardHighRiskOnly,
  setSwitchboardHighRiskOnly,
  layersOn,
  toggleLayer,
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
  const topFlood = Object.entries(flood.bySuburb)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 8);

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

  // Computed once per render: each switchboard's nearest suburb + that suburb's flood risk.
  // Feeds both the always-unfiltered analysis panels below and the layer card's own
  // "high risk only" view, which is a display filter rather than a change to the underlying data.
  //
  // "critical" is a proxy, not a certification: GCCC-owned three-phase switchboards are the only
  // combination the dataset can actually support (TRAFFIC_CONTROL, GENSET_CONNECTION and
  // CURRENT_RATING are null on all 4,119 records — verified via the live API, not assumed).
  const switchboardsWithRisk = (switchboards.data?.features || [])
    .map((f) => {
      const [lon, lat] = f.geometry.coordinates;
      const suburb = nearestSuburb(lon, lat, suburbs);
      return {
        suburb,
        risk: suburb ? flood.bySuburb[normalizeSuburb(suburb)] : null,
        critical: f.properties.class === 'THREE-PHASE' && f.properties.owner === 'GCCC',
      };
    })
    .filter((x) => x.suburb);

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

  const shownSwitchboards = switchboardHighRiskOnly ? riskySwitchboardCount : totalSwitchboards;
  const switchboardCardBySuburb = {};
  switchboardsWithRisk.forEach(({ suburb, risk }) => {
    if (switchboardHighRiskOnly && !(risk && HIGH_RISK.includes(risk.dominant))) return;
    switchboardCardBySuburb[suburb] = (switchboardCardBySuburb[suburb] || 0) + 1;
  });
  const topSwitchboards = Object.entries(switchboardCardBySuburb)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const yearsSinceApprovals = new Date().getFullYear() - 2016;

  const [inspecting, setInspecting] = useState(null);
  const debugByLayer = {
    zoning: zoning.debug,
    historical: historicalDebug,
    flood: flood.debug,
    switchboards: switchboards.debug,
  };

  return (
    <div id="sidebar">
      <div className="section-label">Map layers</div>

      {SHOW_ZONING && (
        <div className="layer-card">
          <div className="layer-toggle" onClick={() => toggleLayer('zoning')}>
            <LayerIcon
              color="#5DCAA5"
              bg="rgba(93,202,165,0.16)"
              path={
                <>
                  <rect x="3" y="3" width="7" height="7" rx="1.2" />
                  <rect x="14" y="3" width="7" height="7" rx="1.2" />
                  <rect x="3" y="14" width="7" height="7" rx="1.2" />
                  <rect x="14" y="14" width="7" height="7" rx="1.2" />
                </>
              }
            />
            <div className="layer-info">
              <div className="name">Current zoning</div>
              <div className="desc">City Plan v9 · live (ArcGIS)</div>
            </div>
            <div className={`switch ${layersOn.zoning ? 'on' : ''}`} />
          </div>
          {layersOn.zoning && (
            <div className="layer-detail">
              <div className="layer-detail-inner">
                <div className="stat-card">
                  <div className="num">{(zoning.data?.features.length || 0).toLocaleString('en-AU')}</div>
                  <div className="label">Mapped residential zones</div>
                </div>
                {zoning.loading && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Loading live...</div>}
                {ZONE_ORDER.filter((t) => zoneCounts[t]).map((t) => (
                  <div className="legend-item" key={t}>
                    <div className="swatch" style={{ background: ZONE_COLORS[t] }} />
                    <div>{ZONE_LABELS[t]}</div>
                    <div className="count">{zoneCounts[t].toLocaleString('en-AU')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {SHOW_HISTORICAL && (
        <div className="layer-card">
          <div className="layer-toggle" onClick={() => toggleLayer('historical')}>
            <LayerIcon
              color="#F2A623"
              bg="rgba(242,166,35,0.16)"
              path={
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3.5 2" />
                </>
              }
            />
            <div className="layer-info">
              <div className="name">Historical approvals</div>
              <div className="desc">{meta.devApps?.reference_period || '2012–2016'}, by suburb</div>
            </div>
            <div className={`switch ${layersOn.historical ? 'on' : ''}`} />
          </div>
          {layersOn.historical && (
            <div className="layer-detail">
              <div className="layer-detail-inner">
                {topHistorical.map((p) => (
                  <div className="legend-item" key={p.suburb}>
                    <div className="swatch" style={{ background: '#F2A623', borderRadius: '50%' }} />
                    <div>{p.suburb}</div>
                    <div className="count">{p.count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="layer-card">
        <div className="layer-toggle" onClick={() => toggleLayer('flood')}>
          <LayerIcon
            color="#4A90D9"
            bg="rgba(74,144,217,0.16)"
            path={<path d="M12 3c0 0 7 7.8 7 12.2A7 7 0 0 1 5 15.2C5 10.8 12 3 12 3z" />}
          />
          <div className="layer-info">
            <div className="name">Flood risk</div>
            <div className="desc">2024 modeling · live (ArcGIS)</div>
          </div>
          <div className={`switch ${layersOn.flood ? 'on' : ''}`} />
        </div>
        {layersOn.flood && (
          <div className="layer-detail">
            <div className="layer-detail-inner">
              {flood.loading && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Loading live...</div>}
              {topFlood.map(([suburb, r]) => (
                <div className="legend-item" key={suburb}>
                  <div
                    className="swatch"
                    style={{ background: RISK_COLOR[r.dominant] || 'var(--text-faint)', borderRadius: '50%' }}
                  />
                  <div>{suburb}</div>
                  <div className="count">{r.score}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="layer-card">
        <div className="layer-toggle" onClick={() => toggleLayer('switchboards')}>
          <LayerIcon
            color="#E0C341"
            bg="rgba(224,195,65,0.16)"
            path={
              <>
                <rect x="6" y="3" width="12" height="18" rx="1.5" />
                <path d="M9 8h6M9 12h6M9 16h3" />
              </>
            }
          />
          <div className="layer-info">
            <div className="name">Electrical switchboards</div>
            <div className="desc">City of Gold Coast · live (ArcGIS)</div>
          </div>
          <div className={`switch ${layersOn.switchboards ? 'on' : ''}`} />
        </div>
        {layersOn.switchboards && (
          <div className="layer-detail">
            <div className="layer-detail-inner">
              <div className="stat-card">
                <div className="num">{shownSwitchboards.toLocaleString('en-AU')}</div>
                <div className="label">
                  {switchboardHighRiskOnly
                    ? `In High/Very High flood-risk suburbs (of ${totalSwitchboards.toLocaleString('en-AU')} mapped)`
                    : "Mapped switchboards, coloured by nearest suburb's flood risk"}
                </div>
              </div>
              <div
                className="layer-toggle"
                style={{ padding: '2px 0 10px' }}
                onClick={() => setSwitchboardHighRiskOnly((v) => !v)}
              >
                <div className="layer-info">
                  <div className="name" style={{ fontSize: 12 }}>Show only High/Very High risk</div>
                </div>
                <div className={`switch ${switchboardHighRiskOnly ? 'on' : ''}`} />
              </div>
              {switchboards.loading && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Loading live...</div>}
              {topSwitchboards.length > 0 && (
                <div style={{ fontSize: 10.5, color: 'var(--text-faint)', margin: '2px 0 6px' }}>
                  Total switchboards per suburb (all types) — see Priority action list below for the
                  critical (GCCC, three-phase) subset.
                </div>
              )}
              {topSwitchboards.map(([suburb, count]) => (
                <div className="legend-item" key={suburb}>
                  <div className="swatch" style={{ background: '#E0C341', borderRadius: '50%' }} />
                  <div>{suburb}</div>
                  <div className="count">{count}</div>
                </div>
              ))}
              {switchboardHighRiskOnly && topSwitchboards.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>No switchboards in a High/Very High risk suburb.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="section-label">Analysis</div>

      <Accordion title="Priority action list" defaultOpen>
        <PriorityActions
          suburbs={suburbs}
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
        <div className="stat-card">
          <div className="num" style={{ color: 'var(--critical)' }}>{yearsSinceApprovals} years</div>
          <div className="label">The time since the development approvals dataset was last genuinely updated.</div>
          <div className="stat-source">Calculated from the interval covered by the dataset (2012–2016)</div>
        </div>
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
        <div className="vintage-row">
          <div className={`vintage-dot ${meta.devApps?.freshness || 'red'}`} />
          <div className="info">
            <b>Development approvals</b>
            <span>{meta.devApps?.reference_period || 'Records 2012–2016'} · Supabase</span>
          </div>
          <button
            className="api-inspect-btn"
            disabled={!debugByLayer.historical}
            onClick={() => setInspecting('historical')}
          >
            View call
          </button>
        </div>
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
