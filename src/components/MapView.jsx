import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useEffect, useMemo } from 'react';
import { ZONE_COLORS, ZONE_LABELS, RISK_COLOR } from '../data/densityColors';

function AutoInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export default function MapView({ zoning, historical, flood, suburbs, layersOn }) {
  const maxCount = useMemo(
    () => Math.max(1, ...historical.map((p) => p.count || 0)),
    [historical]
  );

  return (
    <MapContainer center={[-28.0, 153.42]} zoom={11} zoomControl={false} style={{ height: '100%', width: '100%' }}>
      <AutoInvalidateSize />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap &copy; CARTO"
        subdomains="abcd"
        maxZoom={19}
      />

      {layersOn.zoning && zoning?.data && (
        <GeoJSON
          key="zoning"
          data={zoning.data}
          style={(feature) => ({
            fillColor: ZONE_COLORS[feature.properties.tier],
            fillOpacity: 0.45,
            color: ZONE_COLORS[feature.properties.tier],
            weight: 0.6,
            opacity: 0.8,
          })}
          onEachFeature={(feature, layer) => {
            const label = ZONE_LABELS[feature.properties.tier] || feature.properties.tier;
            layer.bindPopup(
              `<div class="popup-zone">${label}</div>` +
                `<div class="popup-precinct">${feature.properties.precinct || 'No specific precinct'}</div>`
            );
          }}
        />
      )}

      {layersOn.historical &&
        historical.map((p) => (
          <CircleMarker
            key={p.suburb}
            center={[p.lat, p.lon]}
            radius={6 + (p.count / maxCount) * 24}
            pathOptions={{ fillColor: '#F2A623', fillOpacity: 0.35, color: '#F2A623', weight: 1, opacity: 0.8 }}
          >
            <Popup>
              <div className="popup-suburb">{p.suburb}</div>
              <div className="popup-count">{p.count} development applications</div>
            </Popup>
          </CircleMarker>
        ))}

      {layersOn.flood &&
        suburbs
          .filter((s) => flood.bySuburb[s.name])
          .map((s) => {
            const risk = flood.bySuburb[s.name];
            const color = RISK_COLOR[risk.dominant] || '#8B8F97';
            return (
              <CircleMarker
                key={'flood-' + s.name}
                center={[s.lat, s.lon]}
                radius={6 + (risk.score / 100) * 18}
                pathOptions={{ fillColor: color, fillOpacity: 0.45, color, weight: 1, opacity: 0.9 }}
              >
                <Popup>
                  <div className="popup-suburb">{s.name}</div>
                  <div className="popup-count">Risk score: {risk.score}/100</div>
                  <div className="popup-note">Dominant category: {risk.dominant}</div>
                </Popup>
              </CircleMarker>
            );
          })}
    </MapContainer>
  );
}
