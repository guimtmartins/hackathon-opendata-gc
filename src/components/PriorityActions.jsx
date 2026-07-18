import { RISK_COLOR, HIGH_RISK } from '../data/densityColors';
import { normalizeSuburb } from '../lib/arcgis';

export default function PriorityActions({ suburbs, flood, criticalBySuburb, totalBySuburb }) {
  const rows = suburbs
    .map((s) => {
      const risk = flood.bySuburb[normalizeSuburb(s.name)];
      return {
        name: s.name,
        riskScore: risk?.score ?? -1,
        riskDominant: risk?.dominant || null,
        critical: criticalBySuburb[s.name] || 0,
        total: totalBySuburb[s.name] || 0,
      };
    })
    .filter((r) => r.critical > 0 && HIGH_RISK.includes(r.riskDominant))
    .sort((a, b) => b.critical * b.riskScore - a.critical * a.riskScore)
    .slice(0, 10);

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10, lineHeight: 1.4 }}>
        Suburbs ranked by flood risk × exposure of critical electrical infrastructure. "Critical" means
        GCCC-owned, three-phase switchboards — the only combination of fields the dataset actually
        supports as a proxy for infrastructure that can't simply be switched off (see Data sources).
      </div>

      {rows.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
          No suburb currently combines High/Very High flood risk with mapped critical switchboards.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r, i) => (
            <div
              key={r.name}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${RISK_COLOR[r.riskDominant] || 'var(--critical)'}`,
                borderRadius: 8,
                padding: '9px 10px',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', minWidth: 18, textAlign: 'center' }}>
                #{i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.4 }}>
                  {r.critical.toLocaleString('en-AU')} critical switchboard{r.critical === 1 ? '' : 's'} (GCCC,
                  three-phase) of {r.total.toLocaleString('en-AU')} mapped · Flood risk {r.riskScore}/100 (
                  {r.riskDominant})
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
