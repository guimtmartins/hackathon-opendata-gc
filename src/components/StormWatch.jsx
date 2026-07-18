import { RISK_COLOR, HIGH_RISK } from '../data/densityColors';
import { normalizeSuburb } from '../lib/arcgis';

// A suburb counts as "heavy rain" if either threshold is met in the next 48h.
const RAIN_ALERT = { probability: 60, mm: 10 };

export default function StormWatch({ suburbs, flood, rain }) {
  const rows = suburbs
    .map((s) => {
      const risk = flood.bySuburb[normalizeSuburb(s.name)];
      const forecast = rain.bySuburb[s.name];
      return {
        name: s.name,
        riskScore: risk?.score ?? -1,
        riskDominant: risk?.dominant || null,
        maxProbability: forecast?.maxProbability ?? null,
        maxPrecipMm: forecast?.maxPrecipMm ?? null,
      };
    })
    .filter(
      (r) =>
        HIGH_RISK.includes(r.riskDominant) &&
        r.maxProbability !== null &&
        (r.maxProbability >= RAIN_ALERT.probability || r.maxPrecipMm >= RAIN_ALERT.mm)
    )
    .sort((a, b) => b.maxProbability * b.riskScore - a.maxProbability * a.riskScore);

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10, lineHeight: 1.4 }}>
        Suburbs with a heavy rain forecast (next 48h, {RAIN_ALERT.probability}%+ chance or{' '}
        {RAIN_ALERT.mm}mm+) in a suburb with High/Very High flood risk history. Rain forecast comes
        from Open-Meteo, an external source — not one of the two official portals the rest of this
        app restricts itself to (see Data sources).
      </div>

      {rain.loading && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Checking live forecast...</div>}

      {!rain.loading && rows.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
          No suburb currently combines a heavy rain forecast with High/Very High flood risk.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => (
          <div
            key={r.name}
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${RISK_COLOR[r.riskDominant] || 'var(--critical)'}`,
              borderRadius: 8,
              padding: '9px 10px',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{r.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.4 }}>
              {r.maxProbability}% rain chance, up to {r.maxPrecipMm.toFixed(1)}mm in the next 48h · Flood
              risk {r.riskScore}/100 ({r.riskDominant})
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
