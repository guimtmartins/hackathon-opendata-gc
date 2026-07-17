import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    'Supabase not configured: fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (see .env.example).'
  );
}

export const supabaseUrl = url || 'https://placeholder.supabase.co';
export const supabase = createClient(supabaseUrl, anonKey || 'placeholder');
