
import { createClient } from '@supabase/supabase-js';

// Get Environment Variables
// We access these directly so Vite can perform static replacement during the build.
// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Critical check: If these are missing, auth will definitely fail.
// We warn in the console to make debugging easier.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('CRITICAL: Supabase URL or Key is missing. Authentication will fail. Check your .env file or Vercel Environment Variables.');
}

// Create single instance for the app
// We provide a fallback string to prevent the app from crashing immediately on load if keys are missing,
// allowing the UI to at least render (and potentially show an error message later).
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
);

// Helper to check connection status (used in Settings)
export async function testConnection() {
    if (!supabaseUrl || !supabaseAnonKey) return false;
    try {
        // Simple health check query - checks if we can reach the Auth service
        const { data, error } = await supabase.auth.getSession();
        return !error; 
    } catch (e) {
        console.error("Supabase Connection Error:", e);
        return false;
    }
}
