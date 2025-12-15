
import { createClient } from '@supabase/supabase-js';

// Get Environment Variables safely
// Vercel exposes these automatically if configured in Project Settings
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// Warn but don't crash during build time if keys are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Key missing. Authentication will fail in production if not set.');
}

// Create single instance for the app
// We check for undefined to prevent build crashes, but the app needs these to function
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
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') return false;
    try {
        // Simple health check query - checks if we can reach the Auth service
        const { data, error } = await supabase.auth.getSession();
        return !error; 
    } catch (e) {
        console.error("Supabase Connection Error:", e);
        return false;
    }
}