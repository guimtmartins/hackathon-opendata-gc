import { useCallback, useEffect, useState } from 'react';
import { supabase, supabaseUrl } from '../lib/supabaseClient';

const SELECT = 'count, updated_at, suburbs(name, lat, lon)';

const ORIGINAL_SOURCE = {
  label: 'Property Development Applications and Determinations',
  datasetUrl: 'https://www.arcgis.com/home/item.html?id=dcacbfdcaca44819b0f5821857e8ec01',
  apiUrl:
    'https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Property_Development_Applications_and_Determinations/FeatureServer/0',
};

export function useHistorical() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [debug, setDebug] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('development_applications')
        .select(SELECT)
        .order('count', { ascending: false });
      if (err) throw err;

      const { data: metaData } = await supabase
        .from('datasets_meta')
        .select('*')
        .eq('layer_key', 'development_applications')
        .maybeSingle();

      setRows(
        (data || []).map((r) => ({
          suburb: r.suburbs?.name,
          lat: r.suburbs?.lat,
          lon: r.suburbs?.lon,
          count: r.count,
          updatedAt: r.updated_at,
        }))
      );
      setMeta(metaData || null);
      setDebug({
        url: `${supabaseUrl}/rest/v1/development_applications?select=${encodeURIComponent(SELECT)}&order=count.desc`,
        params: { select: SELECT, order: 'count.desc (via .order())' },
        sample: data?.[0] || null,
        originalSource: ORIGINAL_SOURCE,
      });
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, meta, debug, error, loading, reload };
}
