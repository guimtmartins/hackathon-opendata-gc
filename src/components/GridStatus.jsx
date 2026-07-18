import { useState } from 'react';
import { createPortal } from 'react-dom';
import { HIGH_RISK, SWITCHBOARD_RANGE_M } from '../data/densityColors';
import {
  POPULATION_2021,
  AVG_HOUSEHOLD_SIZE,
  OUTAGE_COST_PER_HOUSEHOLD_HOUR_AUD,
} from '../data/population';
import { distanceMeters } from '../lib/arcgis';

function rangeOf(size) {
  return SWITCHBOARD_RANGE_M[(size || 'TBA').toUpperCase()] || SWITCHBOARD_RANGE_M.TBA;
}

function fmtCost(aud) {
  return aud >= 1000 ? `A$${(aud / 1000).toFixed(1)}k` : `A$${aud}`;
}

function Modal({ title, onClose, children }) {
  return createPortal(
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-modal gs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-head">
          <div className="title">{title}</div>
          <button className="admin-close" onClick={onClose}>✕</button>
        </div>
        <div className="admin-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// Live grid-status board for the focus region. One row per suburb; when the
// outage simulation is running, critical boards (GCCC, three-phase) in
// High/Very High flood-risk suburbs flip to offline — correlated flood damage
// on shared low-lying ground, not an electrical cascade (feeder/substation
// topology isn't published, so failures aren't modelled as contagious).
export default function GridStatus({ switchboards, buildings, simOn, loading }) {
  const [openModal, setOpenModal] = useState(null); // 'impact' | 'plan' | null

  const bySuburb = {};
  switchboards.forEach((s) => {
    if (!bySuburb[s.suburb]) bySuburb[s.suburb] = { total: 0, critical: 0, risk: s.risk, areaM2: 0 };
    const entry = bySuburb[s.suburb];
    entry.total += 1;
    if (s.critical) {
      entry.critical += 1;
      const r = rangeOf(s.size);
      entry.areaM2 += Math.PI * r * r;
    }
  });

  const rows = Object.entries(bySuburb)
    .map(([name, e]) => {
      const highRisk = !!(e.risk && HIGH_RISK.includes(e.risk.dominant));
      const offline = simOn && highRisk ? e.critical : 0;
      return { name, ...e, highRisk, offline, online: e.total - offline };
    })
    .sort((a, b) => b.offline - a.offline || b.total - a.total);

  const online = rows.reduce((n, r) => n + r.online, 0);
  const offline = rows.reduce((n, r) => n + r.offline, 0);
  const areaKm2 = rows.reduce((n, r) => n + (r.offline ? r.areaM2 : 0), 0) / 1e6;

  // Impact estimate: population spread evenly across the suburb's switchboards
  // (the only defensible allocation without service-area data), cost from the
  // AER Value of Customer Reliability — both assumptions stated on screen.
  const impact = rows
    .filter((r) => r.offline > 0)
    .map((r) => {
      const pop = POPULATION_2021[r.name] || 0;
      const people = Math.round(pop * (r.offline / r.total));
      const costHour = Math.round((people / AVG_HOUSEHOLD_SIZE) * OUTAGE_COST_PER_HOUSEHOLD_HOUR_AUD);
      return { name: r.name, people, costHour, offline: r.offline };
    });
  const totalPeople = impact.reduce((n, i) => n + i.people, 0);
  const totalCostHour = impact.reduce((n, i) => n + i.costHour, 0);
  const maxPeople = Math.max(1, ...impact.map((i) => i.people));

  // A community building is inside the outage if any offline board's indicative
  // service circle contains it.
  const offlineBoards = simOn
    ? switchboards.filter((s) => s.critical && s.risk && HIGH_RISK.includes(s.risk.dominant))
    : [];
  const facilities = buildings
    .map((b) => ({
      ...b,
      hit: offlineBoards.some((s) => distanceMeters(b.lat, b.lon, s.lat, s.lon) <= rangeOf(s.size)),
    }))
    .sort((a, b) => Number(b.hit) - Number(a.hit) || a.name.localeCompare(b.name));
  const hitFacilities = facilities.filter((f) => f.hit);
  const clearFacilities = facilities.filter((f) => !f.hit);

  const simActive = simOn && offline > 0;

  return (
    <aside id="grid-status">
      <div className="gs-head">
        <div className="gs-title">Grid status</div>
        <div className={`gs-pill ${simActive ? 'down' : 'ok'}`}>
          {simActive ? 'Outage simulation' : 'All systems normal'}
        </div>
      </div>

      <div className="gs-tiles">
        <div className="gs-tile">
          <div className="gs-tile-num ok">{online.toLocaleString('en-AU')}</div>
          <div className="gs-tile-label">Online</div>
        </div>
        <div className="gs-tile">
          <div className={`gs-tile-num ${offline > 0 ? 'down' : ''}`}>{offline.toLocaleString('en-AU')}</div>
          <div className="gs-tile-label">Offline</div>
        </div>
      </div>

      {simActive && (
        <div className="gs-impact">
          ~{Math.round(areaKm2 * 10) / 10} km² combined indicative service area without power
          (each board's own footprint — areas may overlap)
        </div>
      )}

      {simActive && (
        <div className="gs-actions">
          <button className="gs-action-btn" onClick={() => setOpenModal('impact')}>
            <span className="gs-action-num">{totalPeople.toLocaleString('en-AU')}</span>
            <span className="gs-action-label">people affected · Impact</span>
          </button>
          <button className="gs-action-btn" onClick={() => setOpenModal('plan')}>
            <span className="gs-action-num">{hitFacilities.length}</span>
            <span className="gs-action-label">facilities hit · Contingency</span>
          </button>
        </div>
      )}

      {loading && <div className="gs-loading">Loading live data...</div>}

      <div className="gs-rows">
        {rows.map((r) => (
          <div className={`gs-row ${r.offline ? 'down' : ''}`} key={r.name}>
            <div className={`gs-dot ${r.offline ? 'down' : 'ok'}`} />
            <div className="gs-info">
              <div className="gs-name">{r.name}</div>
              <div className="gs-meta">
                {r.total} switchboard{r.total === 1 ? '' : 's'} · {r.critical} critical · flood risk{' '}
                {r.risk ? `${r.risk.score}/100` : '—'}
              </div>
            </div>
            <div className={`gs-state ${r.offline ? 'down' : 'ok'}`}>
              {r.offline ? `${r.offline} offline` : 'online'}
            </div>
          </div>
        ))}
      </div>

      <div className="gs-footnote">
        Simulation: critical switchboards (GCCC, three-phase) in High/Very High flood-risk suburbs
        fail together from flood damage — a shared cause, not an electrical cascade. Map circles are
        each board's own indicative service area by size class (S 150 m · M 300 m · L 600 m); no
        real service-area data is published (see Insights → Data sources).
      </div>

      {openModal === 'impact' && (
        <Modal title="Impact estimate" onClose={() => setOpenModal(null)}>
          <div className="gs-impact-head">
            <span className="gs-impact-people">{totalPeople.toLocaleString('en-AU')} people</span>{' '}
            without power · ~{fmtCost(totalCostHour)}/hour economic impact
          </div>
          <div className="impact-chart">
            {impact.map((i) => (
              <div
                className="impact-row"
                key={i.name}
                title={`${i.name}: ~${i.people.toLocaleString('en-AU')} people · ~${fmtCost(i.costHour)}/h (${i.offline} boards offline)`}
              >
                <div className="impact-label">{i.name}</div>
                <div className="impact-track">
                  <div className="impact-fill" style={{ width: `${(i.people / maxPeople) * 100}%` }} />
                </div>
                <div className="impact-val">
                  {i.people.toLocaleString('en-AU')}
                  <span> · {fmtCost(i.costHour)}/h</span>
                </div>
              </div>
            ))}
          </div>
          <div className="gs-assumptions">
            Estimates, not measurements: ABS Census 2021 population (external source), spread evenly
            across each suburb's switchboards; cost ≈ A${OUTAGE_COST_PER_HOUSEHOLD_HOUR_AUD} per
            household-hour (AER Value of Customer Reliability 2019).
          </div>
        </Modal>
      )}

      {openModal === 'plan' && (
        <Modal title="Contingency plan" onClose={() => setOpenModal(null)}>
          <ol className="gs-plan">
            <li>
              Dispatch mobile generation to the {offline} offline critical boards — priority order{' '}
              {impact.map((i) => i.name).join(' → ')} (most boards down first).
            </li>
            <li>Restore LARGE boards first (600 m indicative footprint), then MEDIUM and SMALL.</li>
            {hitFacilities.length > 0 && (
              <li>
                Check community facilities inside outage areas — likely without power and unusable as
                relief sites.
              </li>
            )}
            {clearFacilities.length > 0 && (
              <li>Stand up relief / cooling hubs at powered community facilities nearby.</li>
            )}
          </ol>

          <div className="gs-section-title" style={{ borderTop: 'none', paddingTop: 4 }}>
            Council facilities in the region
          </div>
          <div className="gs-facilities">
            {facilities.map((f) => (
              <div className="gs-fac" key={f.name + f.lat}>
                <span className={`gs-fac-badge ${f.hit ? 'down' : 'ok'}`}>
                  {f.hit ? 'IN OUTAGE' : 'POWERED'}
                </span>
                <div className="gs-fac-info">
                  <div className="gs-fac-name">{f.name}</div>
                  <div className="gs-fac-meta">{f.suburb}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="gs-assumptions">
            Facility status is geometric: a building is "in outage" when its footprint centroid falls
            inside an offline board's indicative service circle. Buildings: council Buildings_FL
            dataset, fetched live (see Insights → Data sources).
          </div>
        </Modal>
      )}
    </aside>
  );
}
