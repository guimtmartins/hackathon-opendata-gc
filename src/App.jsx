import { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import { useZoning } from './hooks/useZoning';
import { useHistorical } from './hooks/useHistorical';
import { useFloodRisk } from './hooks/useFloodRisk';
import { useSuburbs } from './hooks/useSuburbs';
import { useSuburbZoning } from './hooks/useSuburbZoning';
import './App.css';

export default function App() {
  const zoning = useZoning();
  const historical = useHistorical();
  const flood = useFloodRisk();
  const suburbs = useSuburbs();
  const suburbZoning = useSuburbZoning();

  const [layersOn, setLayersOn] = useState({ zoning: true, historical: false, flood: false });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
          layersOn={layersOn}
          toggleLayer={toggleLayer}
          meta={{ devApps: historical.meta }}
          historicalDebug={historical.debug}
        />
      )}

      <footer>
        Zoning: City of Gold Coast Open Data Portal, City Plan v9 - fetched live. Development
        approvals: Supabase (historical records 2012-2016). Flood risk: Flood Risk
        Overlay, 2024 modeling - fetched live. Suburb locations are approximate (centroid).
      </footer>
    </div>
  );
}
