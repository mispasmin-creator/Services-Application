import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_ANONKEY_URL;

if (!supabaseUrl || !supabaseAnon) {
  console.error('[Supabase] ❌ Missing env vars: VITE_SUPABASE_URL or VITE_ANONKEY_URL');
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: false, // Custom auth — Supabase Auth use nahi kar rahe
  },
});

export default supabase;
