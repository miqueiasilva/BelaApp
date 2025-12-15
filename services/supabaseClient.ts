
import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are loaded or handle missing keys gracefully
// @ts-ignore
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
// @ts-ignore
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simple connection test helper
export async function testConnection() {
    if (!supabaseUrl) return false;
    try {
        // Try to fetch one row from a public table or just check health
        const { error } = await supabase.from('profiles').select('id').limit(1);
        // It's ok if table doesn't exist or is empty, mostly checking for connection error
        return !error || error.code === 'PGRST116'; 
    } catch (e) {
        return false;
    }
}
