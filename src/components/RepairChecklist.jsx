import { useState } from 'react';

// Generic field-repair sequence for flood-damaged switchboards — a standard
// isolate/inspect/restore workflow, not sourced data (there is no public
// per-asset repair-procedure dataset to draw from).
const REPAIR_TASKS = [
  'Dispatch technician to site',
  'Isolate & de-energize board',
  'Inspect and clear flood damage',
  'Test and re-energize',
];

function TaskCard({ board, onRepair }) {
  const [done, setDone] = useState(() => new Array(REPAIR_TASKS.length).fill(false));
  const allDone = done.every(Boolean);
  const doneCount = done.filter(Boolean).length;

  function toggle(i) {
    setDone((d) => d.map((v, idx) => (idx === i ? !v : v)));
  }

  return (
    <div className="rc-card">
      <div className="rc-card-head">
        <span className="rc-dot" />
        <div className="rc-card-title">
          <div className="rc-name">Switchboard SB-{board.assetId}</div>
          <div className="rc-meta">
            {board.suburb} · {board.size || 'size n/a'} · {board.critical ? 'critical' : 'standard'}
          </div>
        </div>
        <div className="rc-progress">{doneCount}/{REPAIR_TASKS.length}</div>
      </div>

      <div className="rc-tasks">
        {REPAIR_TASKS.map((task, i) => (
          <label className={`rc-task ${done[i] ? 'done' : ''}`} key={task}>
            <input type="checkbox" checked={done[i]} onChange={() => toggle(i)} />
            <span className="rc-check" />
            <span className="rc-task-label">{task}</span>
          </label>
        ))}
      </div>

      <button className="rc-done-btn" disabled={!allDone} onClick={() => onRepair(board.idx)}>
        {allDone ? '✓ Mark repaired — bring back online' : 'Complete all steps to restore power'}
      </button>
    </div>
  );
}

// Floating checklist, right side of the map, mirroring Grid Status on the
// left. One card per switchboard currently offline in the simulation — check
// off the repair steps, then confirm to flip that board back online, as if a
// technician had actually gone on-site and fixed it.
export default function RepairChecklist({ boards, onRepair }) {
  if (boards.length === 0) {
    return (
      <aside id="repair-checklist">
        <div className="rc-head">
          <div className="rc-title">Repair checklist</div>
        </div>
        <div className="rc-empty">All switchboards online — nothing to repair.</div>
      </aside>
    );
  }

  return (
    <aside id="repair-checklist">
      <div className="rc-head">
        <div className="rc-title">Repair checklist</div>
        <div className="rc-pill">{boards.length} to fix</div>
      </div>
      <div className="rc-cards">
        {boards.map((b) => (
          <TaskCard key={b.idx} board={b} onRepair={onRepair} />
        ))}
      </div>
    </aside>
  );
}
