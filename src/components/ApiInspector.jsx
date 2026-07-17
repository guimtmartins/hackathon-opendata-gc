import { createPortal } from 'react-dom';

export default function ApiInspector({ title, debug, onClose }) {
  if (!debug) return null;

  return createPortal(
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-modal api-inspector" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-head">
          <div className="title">{title}</div>
          <button className="admin-close" onClick={onClose}>✕</button>
        </div>
        <div className="admin-body">
          {debug.originalSource && (
            <div>
              <div className="section-label" style={{ margin: 0 }}>Original data source</div>
              <div className="api-source-note">
                These records were extracted once from{' '}
                <a href={debug.originalSource.datasetUrl} target="_blank" rel="noopener noreferrer">
                  {debug.originalSource.label}
                </a>{' '}
                (City of Gold Coast Open Data Portal, ArcGIS Hub) and stored in Supabase — this is not a
                live query. The request below is the one the app makes today, against the database.
              </div>
              <pre className="api-code">{debug.originalSource.apiUrl}</pre>
            </div>
          )}

          <div>
            <div className="section-label" style={{ margin: debug.originalSource ? '14px 0 0' : 0 }}>Request</div>
            <pre className="api-code">{debug.url}</pre>
          </div>

          {debug.params && (
            <div>
              <div className="section-label" style={{ margin: '14px 0 0' }}>Parameters</div>
              <pre className="api-code">{JSON.stringify(debug.params, null, 2)}</pre>
            </div>
          )}

          <div>
            <div className="section-label" style={{ margin: '14px 0 0' }}>Sample response</div>
            <pre className="api-code api-code-scroll">{JSON.stringify(debug.sample, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
