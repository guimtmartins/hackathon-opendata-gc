import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { ZONE_COLORS, ZONE_LABELS, RISK_COLOR, HIGH_RISK } from '../data/densityColors';
import { nearestSuburb } from '../lib/arcgis';

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

export default function MapView({ zoning, historical, flood, suburbs, switchboards, switchboardHighRiskOnly, layersOn }) {
  const maxCount = useMemo(
    () => Math.max(1, ...historical.map((p) => p.count || 0)),
    [historical]
  );

  // The Switchboard dataset has no suburb attribute, so each point is bucketed
  // to its nearest suburb centroid to borrow that suburb's flood risk score.
  const switchboardData = useMemo(() => {
    if (!switchboards?.data || !suburbs.length) return null;
    const withRisk = switchboards.data.features.map((f) => {
      const [lon, lat] = f.geometry.coordinates;
      const suburb = nearestSuburb(lon, lat, suburbs);
      const risk = flood.bySuburb[suburb];
      return {
        ...f,
        properties: {
          ...f.properties,
          suburb,
          riskScore: risk?.score ?? null,
          riskDominant: risk?.dominant ?? null,
        },
      };
    });
    const features = switchboardHighRiskOnly
      ? withRisk.filter((f) => HIGH_RISK.includes(f.properties.riskDominant))
      : withRisk;
    return { ...switchboards.data, features };
  }, [switchboards?.data, suburbs, flood.bySuburb, switchboardHighRiskOnly]);

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

      {layersOn.switchboards && switchboardData && (
        <GeoJSON
          key={`switchboards-${switchboardHighRiskOnly}`}
          data={switchboardData}
          pointToLayer={(feature, latlng) => {
            const color = RISK_COLOR[feature.properties.riskDominant] || '#8B8F97';
            return L.circleMarker(latlng, {
              radius: 3,
              fillColor: color,
              fillOpacity: 0.7,
              color,
              weight: 0.5,
              opacity: 0.9,
            });
          }}
          onEachFeature={(feature, layer) => {
            const { suburb, riskScore, riskDominant, class: switchClass } = feature.properties;
            layer.bindPopup(
              `<div class="popup-suburb">${suburb || 'Unknown suburb'}</div>` +
                `<div class="popup-count">${switchClass || 'Switchboard'}</div>` +
                (riskScore !== null
                  ? `<div class="popup-note">Nearest suburb flood risk: ${riskScore}/100 (${riskDominant})</div>`
                  : '')
            );
          }}
        />
      )}
    </MapContainer>
  );
}
