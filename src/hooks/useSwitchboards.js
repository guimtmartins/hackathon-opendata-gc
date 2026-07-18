import { useEffect, useState } from 'react';
import { fetchSwitchboards } from '../lib/arcgis';

export function useSwitchboards() {
  const [data, setData] = useState(null);
  const [debug, setDebug] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSwitchboards()
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
