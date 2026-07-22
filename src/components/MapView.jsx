import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import {
  RISK_COLOR,
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

export default function MapView({ flood, suburbs, switchboards, outageSimOn, offlineIdx, layersOn }) {
  // The Switchboard dataset has no suburb attribute, so each point is bucketed
  // to its nearest suburb centroid to borrow that suburb's flood risk score.
  const switchboardData = useMemo(() => {
    if (!switchboards?.data || !suburbs.length) return null;
    const withRisk = switchboards.data.features.map((f, idx) => {
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
          // Offline in the simulated scenario: App ranks the region's boards by
          // exposure and passes the failing set down, keyed by feature index.
          offline: outageSimOn && offlineIdx.has(idx),
        },
      };
    });
    const features = withRisk.filter((f) => inFocus(f.properties.suburb));
    return { ...switchboards.data, features };
  }, [switchboards?.data, suburbs, flood.bySuburb, outageSimOn, offlineIdx]);

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
          key={`switchboards-${outageSimOn}-${offlineIdx.size}`}
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
