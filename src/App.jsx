import { useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import GridStatus from './components/GridStatus';
import { useZoning } from './hooks/useZoning';
import { useHistorical } from './hooks/useHistorical';
import { useFloodRisk } from './hooks/useFloodRisk';
import { useSuburbs } from './hooks/useSuburbs';
import { useSuburbZoning } from './hooks/useSuburbZoning';
import { useSwitchboards } from './hooks/useSwitchboards';
import { useRainForecast } from './hooks/useRainForecast';
import { useCommunityBuildings } from './hooks/useCommunityBuildings';
import { SHOW_ZONING, inFocus, exposureRank, offlineCountAtHour } from './data/densityColors';
import SeveritySlider from './components/SeveritySlider';
import { normalizeSuburb, nearestSuburb } from './lib/arcgis';
import './App.css';

export default function App() {
  const zoning = useZoning(SHOW_ZONING);
  const historical = useHistorical();
  const flood = useFloodRisk();
  const suburbs = useSuburbs();
  const suburbZoning = useSuburbZoning(SHOW_ZONING);
  const switchboards = useSwitchboards();
  const rain = useRainForecast(suburbs.suburbs);
  const communityBuildings = useCommunityBuildings();

  const [layersOn, setLayersOn] = useState({ zoning: false, historical: false, flood: true, switchboards: true });
  const [outageSimOn, setOutageSimOn] = useState(false);
  const [simSeverity, setSimSeverity] = useState('minor');
  const [simHours, setSimHours] = useState(1);
  const [insightsOpen, setInsightsOpen] = useState(false);

  function toggleLayer(key) {
    setLayersOn((s) => ({ ...s, [key]: !s[key] }));
  }

  function toggleOutageSim() {
    const next = !outageSimOn;
    setOutageSimOn(next);
    if (next) {
      // The simulation is drawn on the switchboards layer, so make sure it's visible.
      setLayersOn((s) => ({ ...s, switchboards: true }));
      // Every run starts at hour 1 — the flood has just begun.
      setSimHours(1);
    }
  }

  // Each switchboard bucketed to its nearest suburb + that suburb's flood risk.
  // Bucketing uses the full suburb list (so far-away boards don't get wrongly
  // assigned to the nearest focus suburb); the focus filter comes after.
  // Shared by the grid-status board and the insights drawer.
  const switchboardsWithRisk = useMemo(() => {
    if (!switchboards.data || !suburbs.suburbs.length) return [];
    return switchboards.data.features
      .map((f, idx) => {
        const [lon, lat] = f.geometry.coordinates;
        const suburb = nearestSuburb(lon, lat, suburbs.suburbs);
        return {
          idx,
          suburb,
          lon,
          lat,
          risk: suburb ? flood.bySuburb[normalizeSuburb(suburb)] : null,
          critical: f.properties.class === 'THREE-PHASE' && f.properties.owner === 'GCCC',
          size: f.properties.size,
        };
      })
      .filter((x) => x.suburb && inFocus(x.suburb));
  }, [switchboards.data, suburbs.suburbs, flood.bySuburb]);

  // The N most exposed boards fail at the selected severity, ramping up with
  // elapsed hours (see offlineCountAtHour). Keyed by original feature index so
  // the map and the status board agree.
  const offlineIdx = useMemo(() => {
    if (!outageSimOn) return new Set();
    const count = offlineCountAtHour(simSeverity, simHours);
    const ranked = [...switchboardsWithRisk].sort((a, b) => exposureRank(b) - exposureRank(a));
    return new Set(ranked.slice(0, count).map((b) => b.idx));
  }, [switchboardsWithRisk, outageSimOn, simSeverity, simHours]);

  const boardsForStatus = useMemo(
    () => switchboardsWithRisk.map((b) => ({ ...b, offline: offlineIdx.has(b.idx) })),
    [switchboardsWithRisk, offlineIdx]
  );

  // Community buildings bucketed to a suburb the same way, so the bbox query's
  // spillover (Southport, Helensvale edges) drops out of the focus region.
  const buildingsInFocus = useMemo(() => {
    if (!communityBuildings.buildings.length || !suburbs.suburbs.length) return [];
    return communityBuildings.buildings
      .map((b) => ({ ...b, suburb: nearestSuburb(b.lon, b.lat, suburbs.suburbs) }))
      .filter((b) => b.suburb && inFocus(b.suburb));
  }, [communityBuildings.buildings, suburbs.suburbs]);

  return (
    <div id="app">
      <div id="map">
        <MapView
          zoning={zoning}
          historical={historical.rows}
          flood={flood}
          suburbs={suburbs.suburbs}
          switchboards={switchboards}
          outageSimOn={outageSimOn}
          offlineIdx={offlineIdx}
          layersOn={layersOn}
        />
      </div>

      <header>
        <div className="titles">
          <h1>Data<span>Gap</span> Gold Coast</h1>
          <div className="subtitle">Flood risk × electrical grid · Runaway Bay demo region</div>
        </div>

        <div className="layer-chips">
          <button className={`chip ${layersOn.flood ? 'on' : ''}`} onClick={() => toggleLayer('flood')}>
            <span className="chip-dot" style={{ background: '#4A90D9' }} />
            Flood risk
          </button>
          <button className={`chip ${layersOn.switchboards ? 'on' : ''}`} onClick={() => toggleLayer('switchboards')}>
            <span className="chip-dot" style={{ background: '#E0C341' }} />
            Switchboards
          </button>
          <button className={`chip ${insightsOpen ? 'on' : ''}`} onClick={() => setInsightsOpen((o) => !o)}>
            Insights
          </button>
        </div>

        <button className={`sim-cta ${outageSimOn ? 'active' : ''}`} onClick={toggleOutageSim}>
          {outageSimOn ? '■ Stop simulation' : '⚡ Simulate flood outage'}
        </button>
      </header>

      <GridStatus
        switchboards={boardsForStatus}
        buildings={buildingsInFocus}
        simOn={outageSimOn}
        severity={simSeverity}
        hours={simHours}
        loading={switchboards.loading || flood.loading}
      />

      {outageSimOn && (
        <SeveritySlider
          severity={simSeverity}
          setSeverity={setSimSeverity}
          hours={simHours}
          setHours={setSimHours}
          offlineCount={offlineIdx.size}
        />
      )}

      {insightsOpen && (
        <Sidebar
          zoning={zoning}
          historical={historical.rows}
          flood={flood}
          suburbs={suburbs.suburbs}
          suburbZoning={suburbZoning}
          switchboards={switchboards}
          switchboardsWithRisk={switchboardsWithRisk}
          communityBuildings={communityBuildings}
          rain={rain}
          meta={{ devApps: historical.meta }}
          historicalDebug={historical.debug}
        />
      )}

      <footer style={{ right: insightsOpen ? 448 : 14 }}>
        {SHOW_ZONING && 'Zoning: City of Gold Coast Open Data Portal, City Plan v9 - fetched live. '}
        Development approvals: Supabase (historical records 2012-2016). Flood risk: Flood Risk
        Overlay, 2024 modeling - fetched live. Electrical switchboards: City of Gold Coast Open
        Data Portal - fetched live. Rain forecast: Open-Meteo (external source) - fetched live.
        Suburb locations are approximate (centroid).
      </footer>
    </div>
  );
}
