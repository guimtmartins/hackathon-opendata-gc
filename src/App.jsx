import { useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import GridStatus from './components/GridStatus';
import { useFloodRisk } from './hooks/useFloodRisk';
import { useSuburbs } from './hooks/useSuburbs';
import { useSwitchboards } from './hooks/useSwitchboards';
import { useRainForecast } from './hooks/useRainForecast';
import { useCommunityBuildings } from './hooks/useCommunityBuildings';
import { inFocus, exposureRank, offlineCountAtHour } from './data/densityColors';
import SeveritySlider from './components/SeveritySlider';
import RepairChecklist from './components/RepairChecklist';
import { normalizeSuburb, nearestSuburb } from './lib/arcgis';
import './App.css';

export default function App() {
  const flood = useFloodRisk();
  const suburbs = useSuburbs();
  const switchboards = useSwitchboards();
  const rain = useRainForecast(suburbs.suburbs);
  const communityBuildings = useCommunityBuildings();

  const [layersOn, setLayersOn] = useState({ flood: true, switchboards: true });
  const [outageSimOn, setOutageSimOn] = useState(false);
  const [simSeverity, setSimSeverity] = useState('minor');
  const [simHours, setSimHours] = useState(1);
  const [insightsOpen, setInsightsOpen] = useState(false);
  // Boards a technician has been marked as having fixed on-site — an override
  // on top of the severity/hours ramp, not part of it, so a repaired board
  // stays online even if the slider moves further.
  const [repairedIdx, setRepairedIdx] = useState(new Set());

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
      setRepairedIdx(new Set());
    }
  }

  function repairBoard(idx) {
    setRepairedIdx((prev) => new Set(prev).add(idx));
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
          assetId: f.properties.assetId,
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

  // What's actually down right now: the ramp's failures minus anything a
  // technician has already fixed on-site.
  const effectiveOfflineIdx = useMemo(() => {
    const s = new Set(offlineIdx);
    repairedIdx.forEach((i) => s.delete(i));
    return s;
  }, [offlineIdx, repairedIdx]);

  const boardsForStatus = useMemo(
    () => switchboardsWithRisk.map((b) => ({ ...b, offline: effectiveOfflineIdx.has(b.idx) })),
    [switchboardsWithRisk, effectiveOfflineIdx]
  );

  const boardsNeedingRepair = useMemo(
    () => switchboardsWithRisk.filter((b) => effectiveOfflineIdx.has(b.idx)),
    [switchboardsWithRisk, effectiveOfflineIdx]
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
          flood={flood}
          suburbs={suburbs.suburbs}
          switchboards={switchboards}
          outageSimOn={outageSimOn}
          offlineIdx={effectiveOfflineIdx}
          layersOn={layersOn}
        />
      </div>

      <header>
        <div className="titles">
          <h1>Switch<span>Guard</span></h1>
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
          offlineCount={effectiveOfflineIdx.size}
        />
      )}

      {outageSimOn && !insightsOpen && (
        <RepairChecklist boards={boardsNeedingRepair} onRepair={repairBoard} />
      )}

      {insightsOpen && (
        <Sidebar
          flood={flood}
          suburbs={suburbs.suburbs}
          switchboards={switchboards}
          switchboardsWithRisk={switchboardsWithRisk}
          communityBuildings={communityBuildings}
          rain={rain}
        />
      )}
    </div>
  );
}
