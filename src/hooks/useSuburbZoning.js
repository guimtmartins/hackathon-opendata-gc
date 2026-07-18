import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useSuburbZoning(enabled = true) {
  const [bySuburb, setBySuburb] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('suburb_zoning')
      .select('tier, count, suburbs(name)')
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err);
          return;
        }
        const map = {};
        (data || []).forEach((r) => {
          const name = r.suburbs?.name;
          if (!name) return;
          if (!map[name]) map[name] = {};
          map[name][r.tier] = r.count;
        });
        setBySuburb(map);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { bySuburb, error, loading };
}
