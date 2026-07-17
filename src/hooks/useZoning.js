import { useEffect, useState } from 'react';
import { fetchZoning } from '../lib/arcgis';

export function useZoning() {
  const [data, setData] = useState(null);
  const [debug, setDebug] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchZoning()
      .then((result) => {
        if (!cancelled) {
          setData(result.geojson);
          setDebug(result.debug);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, debug, error, loading };
}
