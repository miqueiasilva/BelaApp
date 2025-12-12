
import { createClient } from '@supabase/supabase-js';

// NOTA DE SEGURANÇA:
// Em produção, mova estas chaves para um arquivo .env (ex: VITE_SUPABASE_URL)
// e acesse via import.meta.env.VITE_SUPABASE_URL.
// Nunca exponha a 'service_role' key no frontend. Use apenas a 'anon' key.

const SUPABASE_URL = 'https://rxtwmwrgcilmsldtqdfe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jpVmCuQ3xmbWWcvgHn_H3g_Vypfyw0x';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
