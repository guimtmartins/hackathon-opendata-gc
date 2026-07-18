import { useEffect, useState } from 'react';
import { fetchCommunityBuildings } from '../lib/arcgis';
import { FOCUS_BBOX } from '../data/densityColors';

export function useCommunityBuildings() {
  const [buildings, setBuildings] = useState([]);
  const [debug, setDebug] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCommunityBuildings(FOCUS_BBOX)
      .then((result) => {
        if (!cancelled) {
          setBuildings(result.buildings);
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

  return { buildings, debug, error, loading };
}
