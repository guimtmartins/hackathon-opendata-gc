import { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import { useZoning } from './hooks/useZoning';
import { useHistorical } from './hooks/useHistorical';
import { useFloodRisk } from './hooks/useFloodRisk';
import { useSuburbs } from './hooks/useSuburbs';
import { useSuburbZoning } from './hooks/useSuburbZoning';
import { useSwitchboards } from './hooks/useSwitchboards';
import { SHOW_ZONING } from './data/densityColors';
import './App.css';

export default function App() {
  const zoning = useZoning(SHOW_ZONING);
  const historical = useHistorical();
  const flood = useFloodRisk();
  const suburbs = useSuburbs();
  const suburbZoning = useSuburbZoning(SHOW_ZONING);
  const switchboards = useSwitchboards();

  const [layersOn, setLayersOn] = useState({ zoning: false, historical: false, flood: false, switchboards: false });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [switchboardHighRiskOnly, setSwitchboardHighRiskOnly] = useState(false);

  function toggleLayer(key) {
    setLayersOn((s) => ({ ...s, [key]: !s[key] }));
  }

  return (
    <div id="app">
      <div id="map">
        <MapView
          zoning={zoning}
          historical={historical.rows}
          flood={flood}
          suburbs={suburbs.suburbs}
          switchboards={switchboards}
          switchboardHighRiskOnly={switchboardHighRiskOnly}
          layersOn={layersOn}
        />
      </div>

      <header>
        <div className="titles">
          <h1>Data<span>Gap</span> Gold Coast</h1>
          <div className="subtitle">Zoning, development approvals and flood risk - Gold Coast</div>
        </div>
        <button id="sidebar-toggle" title="Show/hide panel" onClick={() => setSidebarCollapsed((c) => !c)}>
          {sidebarCollapsed ? '<<' : '>>'}
        </button>
      </header>

      {!sidebarCollapsed && (
        <Sidebar
          zoning={zoning}
          historical={historical.rows}
          flood={flood}
          suburbs={suburbs.suburbs}
          suburbZoning={suburbZoning}
          switchboards={switchboards}
          switchboardHighRiskOnly={switchboardHighRiskOnly}
          setSwitchboardHighRiskOnly={setSwitchboardHighRiskOnly}
          layersOn={layersOn}
          toggleLayer={toggleLayer}
          meta={{ devApps: historical.meta }}
          historicalDebug={historical.debug}
        />
      )}

      <footer>
        {SHOW_ZONING && 'Zoning: City of Gold Coast Open Data Portal, City Plan v9 - fetched live. '}
        Development approvals: Supabase (historical records 2012-2016). Flood risk: Flood Risk
        Overlay, 2024 modeling - fetched live. Electrical switchboards: City of Gold Coast Open
        Data Portal - fetched live. Suburb locations are approximate (centroid).
      </footer>
    </div>
  );
}
