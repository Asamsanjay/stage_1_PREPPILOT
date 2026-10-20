import { createClient } from '@supabase/supabase-js';

const envObj = (typeof import.meta !== 'undefined' && import.meta.env) || (typeof process !== 'undefined' && process.env) || {};
const supabaseUrl = envObj.VITE_SUPABASE_URL || '';
const supabaseAnonKey = envObj.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('your-supabase-project-id') &&
    !supabaseAnonKey.includes('your-supabase-anon-key-here') &&
    !supabaseUrl.includes('placeholder.supabase.co')
  );
};

if (!isSupabaseConfigured()) {
  console.error(
    'CRITICAL: Supabase credentials (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are missing or set to defaults in .env file.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://unconfigured-supabase-url.supabase.co',
  supabaseAnonKey || 'unconfigured-anon-key'
);

let isRegistering = false;

export const setRegisteringFlag = (val) => {
  isRegistering = Boolean(val);
};

export const getRegisteringFlag = () => {
  return isRegistering;
};

