import { useEffect, useState } from 'react';
import { fetchRainForecast } from '../lib/weather';

export function useRainForecast(suburbs) {
  const [bySuburb, setBySuburb] = useState({});
  const [debug, setDebug] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!suburbs.length) return;
    let cancelled = false;
    setLoading(true);
    fetchRainForecast(suburbs)
      .then((result) => {
        if (!cancelled) {
          setBySuburb(result.bySuburb);
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
  }, [suburbs]);

  return { bySuburb, debug, error, loading };
}
