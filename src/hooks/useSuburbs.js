import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useSuburbs() {
  const [suburbs, setSuburbs] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('suburbs')
      .select('name, lat, lon')
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError(err);
        else setSuburbs(data || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { suburbs, error, loading };
}
