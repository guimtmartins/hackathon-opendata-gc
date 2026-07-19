import { SEVERITY_LEVELS, severityLevel, RAMP_HOURS } from '../data/densityColors';

// Draggable severity + time controls, floating bottom-centre over the map
// while the outage simulation runs. Severity picks the event's ceiling (how
// many boards ultimately fail); hours ramps toward that ceiling — a stated
// linear assumption, reaching full severity by RAMP_HOURS.
export default function SeveritySlider({ severity, setSeverity, hours, setHours, offlineCount }) {
  const idx = Math.max(0, SEVERITY_LEVELS.findIndex((l) => l.id === severity));
  const lvl = severityLevel(severity);
  const fullyDeveloped = hours >= RAMP_HOURS;

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

      <div className="ss-head ss-hours-head">
        <span className="ss-title">Hours since flood began</span>
        <span className="ss-value">
          {fullyDeveloped ? `${hours}h · fully developed` : `${hours}h of ~${RAMP_HOURS}h`}
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="8"
        step="1"
        value={hours}
        aria-label="Hours since flood began"
        onChange={(e) => setHours(Number(e.target.value))}
      />
    </div>
  );
}
