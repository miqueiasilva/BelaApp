
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const getEnvVar = (key: string): string | null => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}
  try {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) {
      // @ts-ignore
      return window.__ENV__[key];
    }
  } catch (e) {}
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch (e) {}
  return null;
};

const FALLBACK_URL = "https://rxtwmwrgcilmsldtqdfe.supabase.co";
const FALLBACK_KEY = "sb_publishable_jpVmCuQ3xmbWWcvgHn_H3g_Vypfyw0x";

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || FALLBACK_URL;
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || FALLBACK_KEY;

// Validação de inicialização (Startup Logs)
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ CRITICAL: Supabase credentials missing! Check environment variables.");
} else if (process.env.NODE_ENV === 'development') {
    console.info("✅ Supabase initialized with:", supabaseUrl.substring(0, 15) + "...");
}

export const isConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = (isConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }) 
  : null) as unknown as SupabaseClient;

export const saveSupabaseConfig = (url: string, key: string) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('VITE_SUPABASE_URL', url);
    localStorage.setItem('VITE_SUPABASE_ANON_KEY', key);
    window.location.reload();
  }
};
