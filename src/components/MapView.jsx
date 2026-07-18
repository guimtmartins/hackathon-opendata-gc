import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import {
  ZONE_COLORS,
  ZONE_LABELS,
  RISK_COLOR,
  HIGH_RISK,
  SWITCHBOARD_MARKER_PX,
  SWITCHBOARD_RANGE_M,
  OFFLINE_COLOR,
  FOCUS_SUBURBS,
  FOCUS_CENTER,
  FOCUS_ZOOM,
  inFocus,
} from '../data/densityColors';
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

export default function MapView({ zoning, historical, flood, suburbs, switchboards, outageSimOn, layersOn }) {
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
      const critical = f.properties.class === 'THREE-PHASE' && f.properties.owner === 'GCCC';
      return {
        ...f,
        properties: {
          ...f.properties,
          suburb,
          riskScore: risk?.score ?? null,
          riskDominant: risk?.dominant ?? null,
          // Offline in the simulated scenario: every critical (GCCC, three-phase)
          // switchboard in a High/Very High flood-risk suburb fails at once.
          offline: outageSimOn && critical && HIGH_RISK.includes(risk?.dominant),
        },
      };
    });
    const features = withRisk.filter((f) => inFocus(f.properties.suburb));
    return { ...switchboards.data, features };
  }, [switchboards?.data, suburbs, flood.bySuburb, outageSimOn]);

  return (
    // preferCanvas: 4k+ circle markers as individual SVG nodes make the page crawl;
    // canvas rendering keeps the same look at a fraction of the cost.
    <MapContainer
      center={FOCUS_SUBURBS.length ? FOCUS_CENTER : [-28.0, 153.42]}
      zoom={FOCUS_SUBURBS.length ? FOCUS_ZOOM : 11}
      zoomControl={false}
      preferCanvas
      style={{ height: '100%', width: '100%' }}
    >
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
          .filter((s) => flood.bySuburb[s.name] && inFocus(s.name))
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
          key={`switchboards-${outageSimOn}`}
          data={switchboardData}
          pointToLayer={(feature, latlng) => {
            const { riskDominant, size, offline } = feature.properties;
            const sizeKey = (size || 'TBA').toUpperCase();
            const radius = SWITCHBOARD_MARKER_PX[sizeKey] || SWITCHBOARD_MARKER_PX.TBA;
            if (offline) {
              // Indicative coverage circle (metres, scales with zoom) + the marker itself.
              const range = L.circle(latlng, {
                radius: SWITCHBOARD_RANGE_M[sizeKey] || SWITCHBOARD_RANGE_M.TBA,
                fillColor: OFFLINE_COLOR,
                fillOpacity: 0.12,
                color: OFFLINE_COLOR,
                weight: 1,
                opacity: 0.7,
                dashArray: '4 3',
              });
              const marker = L.circleMarker(latlng, {
                radius,
                fillColor: OFFLINE_COLOR,
                fillOpacity: 0.9,
                color: '#fff',
                weight: 0.8,
                opacity: 0.9,
              });
              return L.featureGroup([range, marker]);
            }
            const color = RISK_COLOR[riskDominant] || '#8B8F97';
            return L.circleMarker(latlng, {
              radius,
              fillColor: color,
              fillOpacity: outageSimOn ? 0.35 : 0.7,
              color,
              weight: 0.5,
              opacity: outageSimOn ? 0.5 : 0.9,
            });
          }}
          onEachFeature={(feature, layer) => {
            const { suburb, riskScore, riskDominant, class: switchClass, size, offline } = feature.properties;
            const sizeKey = (size || 'TBA').toUpperCase();
            const rangeM = SWITCHBOARD_RANGE_M[sizeKey] || SWITCHBOARD_RANGE_M.TBA;
            layer.bindPopup(
              `<div class="popup-suburb">${suburb || 'Unknown suburb'}</div>` +
                `<div class="popup-count">${switchClass || 'Switchboard'}${size ? ` · ${size}` : ''}</div>` +
                (offline
                  ? `<div class="popup-note" style="color:${OFFLINE_COLOR}">OFFLINE (simulated flood damage) — its own ${rangeM} m indicative service area, not a spread zone</div>`
                  : '') +
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
