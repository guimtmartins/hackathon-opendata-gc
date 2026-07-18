import { useMemo, useState } from 'react';
import { ZONE_COLORS, RISK_COLOR, HIGH_RISK, SHOW_ZONING } from '../data/densityColors';
import { normalizeSuburb } from '../lib/arcgis';

const TIERS = [
  'High density residential',
  'Medium density residential',
  'Low density residential',
  'Rural residential',
];

function ZoningBar({ mix }) {
  const total = TIERS.reduce((s, t) => s + (mix?.[t] || 0), 0);
  if (!total) return <span style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>no data</span>;
  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', width: '100%' }}>
      {TIERS.map((t) =>
        mix?.[t] ? (
          <div
            key={t}
            title={`${t}: ${mix[t]} lots`}
            style={{ width: `${(mix[t] / total) * 100}%`, background: ZONE_COLORS[t] }}
          />
        ) : null
      )}
    </div>
  );
}

export default function CrossView({ suburbs, historical, flood, suburbZoning, switchboardsBySuburb }) {
  const [sortKey, setSortKey] = useState('count');

  const allRows = useMemo(() => {
    return suburbs.map((s) => {
      const h = historical.find((r) => r.suburb === s.name);
      const risk = flood.bySuburb[normalizeSuburb(s.name)];
      const mix = suburbZoning.bySuburb[s.name];
      const zonedTotal = TIERS.reduce((sum, t) => sum + (mix?.[t] || 0), 0);
      return {
        name: s.name,
        count: h?.count || 0,
        riskScore: risk?.score ?? -1,
        riskDominant: risk?.dominant || null,
        mix,
        zonedTotal,
        switchboards: switchboardsBySuburb?.[s.name] || 0,
      };
    });
  }, [suburbs, historical, flood, suburbZoning, switchboardsBySuburb]);

  const rows = useMemo(
    () => allRows.filter((r) => (SHOW_ZONING ? r.zonedTotal > 0 : r.count > 0 || r.riskScore >= 0)),
    [allRows]
  );
  const excludedCount = allRows.length - rows.length;

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => b[sortKey] - a[sortKey]);
    return copy;
  }, [rows, sortKey]);

  const highlights = useMemo(() => {
    if (!rows.length) return [];
    const byCountDesc = [...rows].sort((a, b) => b.count - a.count);
    const medianCount = byCountDesc[Math.floor(byCountDesc.length / 2)]?.count ?? 0;

    const topActivity = byCountDesc[0];

    const riskAlert = [...rows]
      .filter((r) => r.count >= medianCount && r.name !== topActivity?.name)
      .sort((a, b) => b.riskScore - a.riskScore)[0];

    const underused = SHOW_ZONING
      ? [...rows]
          .filter((r) => r.zonedTotal >= 20 && r.name !== topActivity?.name && r.name !== riskAlert?.name)
          .sort((a, b) => a.count / a.zonedTotal - b.count / b.zonedTotal)[0]
      : null;

    const infraExposure = [...rows]
      .filter((r) => HIGH_RISK.includes(r.riskDominant) && r.switchboards > 0)
      .sort((a, b) => b.switchboards - a.switchboards)[0];

    const items = [];
    if (topActivity) {
      items.push({
        color: 'var(--warning)',
        title: `${topActivity.name} leads in approvals`,
        body: `${topActivity.count.toLocaleString('en-AU')} approvals recorded (2012–2016), the highest count among the mapped suburbs.`,
      });
    }
    if (riskAlert) {
      items.push({
        color: RISK_COLOR[riskAlert.riskDominant] || 'var(--critical)',
        title: `${riskAlert.name}: activity in a risk area`,
        body: `Flood risk ${riskAlert.riskScore}/100 (${riskAlert.riskDominant}), with ${riskAlert.count.toLocaleString('en-AU')} approvals already recorded in the period.`,
      });
    }
    if (underused) {
      const pct = Math.round((underused.count / underused.zonedTotal) * 100);
      items.push({
        color: 'var(--good)',
        title: `${underused.name}: underused zoned capacity`,
        body: `${underused.zonedTotal.toLocaleString('en-AU')} lots zoned for residential use, but only ${underused.count.toLocaleString('en-AU')} approvals in the period (~${pct}% apparent uptake).`,
      });
    }
    if (infraExposure) {
      items.push({
        color: RISK_COLOR[infraExposure.riskDominant] || 'var(--critical)',
        title: `${infraExposure.name}: electrical infrastructure exposure`,
        body: `${infraExposure.switchboards.toLocaleString('en-AU')} switchboards mapped in a suburb with ${infraExposure.riskDominant} flood risk (${infraExposure.riskScore}/100) — a proxy for how much network infrastructure sits in the exposed zone.`,
      });
    }
    return items;
  }, [rows]);

  function SortButton({ k, label }) {
    return (
      <button
        onClick={() => setSortKey(k)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          font: 'inherit',
          cursor: 'pointer',
          color: sortKey === k ? 'var(--text)' : 'var(--text-faint)',
          fontWeight: sortKey === k ? 700 : 600,
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10, lineHeight: 1.4 }}>
        {SHOW_ZONING
          ? 'Zoning (allowed capacity) × approvals (actual activity) × flood risk × electrical infrastructure, by suburb.'
          : 'Approvals (actual activity) × flood risk × electrical infrastructure (switchboards), by suburb.'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {highlights.map((h) => (
          <div
            key={h.title}
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${h.color}`,
              borderRadius: 8,
              padding: '9px 10px',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{h.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.4 }}>{h.body}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          fontSize: 10.5,
          color: 'var(--text-faint)',
          marginBottom: 6,
          paddingBottom: 6,
          paddingRight: 10,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ flex: 1 }}>Suburb</div>
        <div style={{ width: 60, textAlign: 'right' }}>
          <SortButton k="count" label="Appr." />
        </div>
        <div style={{ width: 46, textAlign: 'right' }}>
          <SortButton k="riskScore" label="Risk" />
        </div>
        <div style={{ width: 50, textAlign: 'right' }}>
          <SortButton k="switchboards" label="SB" />
        </div>
        {SHOW_ZONING && (
          <div style={{ width: 62, textAlign: 'right' }}>
            <SortButton k="zonedTotal" label="Zoned" />
          </div>
        )}
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 10 }}>
        {sorted.map((r) => (
          <div
            key={r.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 0',
              borderBottom: '1px solid var(--border)',
              fontSize: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
              {SHOW_ZONING && (
                <div style={{ marginTop: 3 }}>
                  <ZoningBar mix={r.mix} />
                </div>
              )}
            </div>
            <div style={{ width: 60, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.count}</div>
            <div style={{ width: 46, textAlign: 'right' }}>
              {r.riskScore >= 0 ? (
                <span
                  style={{
                    color: RISK_COLOR[r.riskDominant] || 'var(--text-dim)',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 600,
                  }}
                >
                  {r.riskScore}
                </span>
              ) : (
                <span style={{ color: 'var(--text-faint)' }}>—</span>
              )}
            </div>
            <div style={{ width: 50, textAlign: 'right', color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
              {r.switchboards || '—'}
            </div>
            {SHOW_ZONING && (
              <div style={{ width: 62, textAlign: 'right', color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                {r.zonedTotal || '—'}
              </div>
            )}
          </div>
        ))}
      </div>
      {excludedCount > 0 && (
        <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 8 }}>
          {SHOW_ZONING
            ? `${excludedCount} suburbs that are mostly rural/conservation area, with no mapped residential zoning, are not shown.`
            : `${excludedCount} suburbs with no recorded approvals or flood risk data are not shown.`}
        </div>
      )}
    </div>
  );
}
