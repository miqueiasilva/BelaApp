import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Helper to get env vars safely using Vite standard
const getEnv = (key: string): string => {
  // @ts-ignore
  return (import.meta as any).env ? (import.meta as any).env[key] || '' : '';
};

// Access environment variables directly via Vite
// Fallback to local storage for manual configuration via EnvGate
const envUrl = getEnv('VITE_SUPABASE_URL');
const envKey = getEnv('VITE_SUPABASE_ANON_KEY');

const localUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('VITE_SUPABASE_URL') : null;
const localKey = typeof localStorage !== 'undefined' ? localStorage.getItem('VITE_SUPABASE_ANON_KEY') : null;

const supabaseUrl = envUrl || localUrl;
const supabaseAnonKey = envKey || localKey;

export const isConfigured = !!(supabaseUrl && supabaseAnonKey);

// Initialize client ONLY if configured to prevent runtime crash on load
// We cast as SupabaseClient to satisfy TypeScript usage in other files
export const supabase = (isConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!) 
  : null) as unknown as SupabaseClient;

// Helpers for the EnvGate component
export const saveSupabaseConfig = (url: string, key: string) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('VITE_SUPABASE_URL', url);
    localStorage.setItem('VITE_SUPABASE_ANON_KEY', key);
    window.location.reload();
  }
};

export const clearSupabaseConfig = () => {
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('VITE_SUPABASE_URL');
        localStorage.removeItem('VITE_SUPABASE_ANON_KEY');
        window.location.reload();
    }
}

// Helper to check connection status
export async function testConnection() {
    if (!isConfigured || !supabase) return false;
    try {
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
        return true;
    } catch (e) {
        console.error("Supabase Connection Error:", e);
        return false;
    }
}