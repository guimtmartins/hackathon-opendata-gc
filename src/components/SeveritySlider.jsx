import { SEVERITY_LEVELS, severityLevel } from '../data/densityColors';

// Draggable severity control, floating bottom-centre over the map while the
// outage simulation runs. Dragging steps through Minor → Moderate → Severe.
export default function SeveritySlider({ severity, setSeverity, offlineCount }) {
  const idx = Math.max(0, SEVERITY_LEVELS.findIndex((l) => l.id === severity));
  const lvl = severityLevel(severity);

  return (
    <div id="severity-slider" style={{ '--sev-color': lvl.color }}>
      <div className="ss-head">
        <span className="ss-title">Flood severity</span>
        <span className="ss-value">
          {lvl.label} · {offlineCount} boards offline
        </span>
      </div>
      <input
        type="range"
        min="0"
        max={SEVERITY_LEVELS.length - 1}
        step="1"
        value={idx}
        aria-label="Flood severity"
        onChange={(e) => setSeverity(SEVERITY_LEVELS[Number(e.target.value)].id)}
      />
      <div className="ss-labels">
        {SEVERITY_LEVELS.map((l) => (
          <button
            key={l.id}
            className={l.id === severity ? 'on' : ''}
            style={l.id === severity ? { color: l.color } : undefined}
            onClick={() => setSeverity(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
