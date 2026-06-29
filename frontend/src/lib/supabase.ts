import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const hasValidSupabaseUrl = Boolean(
  supabaseUrl &&
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl) &&
    !supabaseUrl.includes('your-project'),
);
const hasValidAnonKey = Boolean(
  supabaseAnonKey &&
    supabaseAnonKey !== 'your-supabase-anon-key',
);

export const isSupabaseConfigured = hasValidSupabaseUrl && hasValidAnonKey;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
