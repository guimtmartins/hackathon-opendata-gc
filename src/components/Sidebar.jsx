import { useState } from 'react';
import { inFocus } from '../data/densityColors';
import PriorityActions from './PriorityActions';
import StormWatch from './StormWatch';
import ApiInspector from './ApiInspector';

const INSPECTOR_TITLES = {
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
  flood,
  suburbs,
  switchboards,
  switchboardsWithRisk,
  communityBuildings,
  rain,
}) {
  // "critical" is a proxy, not a certification: GCCC-owned three-phase switchboards are the only
  // combination the dataset can actually support (TRAFFIC_CONTROL, GENSET_CONNECTION and
  // CURRENT_RATING are null on all 4,119 records — verified via the live API, not assumed).
  const switchboardsBySuburb = {};
  const criticalSwitchboardsBySuburb = {};
  switchboardsWithRisk.forEach(({ suburb, critical }) => {
    switchboardsBySuburb[suburb] = (switchboardsBySuburb[suburb] || 0) + 1;
    if (critical) criticalSwitchboardsBySuburb[suburb] = (criticalSwitchboardsBySuburb[suburb] || 0) + 1;
  });

  const [inspecting, setInspecting] = useState(null);
  const debugByLayer = {
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

      <Accordion title="Data sources">
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
