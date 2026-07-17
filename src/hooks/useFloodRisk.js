import { useEffect, useState } from 'react';
import { fetchFloodRiskBySuburb } from '../lib/arcgis';

export function useFloodRisk() {
  const [bySuburb, setBySuburb] = useState({});
  const [citywide, setCitywide] = useState(null);
  const [debug, setDebug] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchFloodRiskBySuburb()
      .then((data) => {
        if (!cancelled) {
          setBySuburb(data.bySuburb);
          setCitywide(data.citywide);
          setDebug(data.debug);
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

  return { bySuburb, citywide, debug, error, loading };
}
