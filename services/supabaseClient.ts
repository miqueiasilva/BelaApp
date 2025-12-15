import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// SUPABASE CONFIG
// ------------------------------------------------------------------
// Vercel (ou .env):
// VITE_SUPABASE_URL = https://xxxx.supabase.co
// VITE_SUPABASE_KEY = sb_publishable_...   (ou eyJ...)
// (compat) VITE_SUPABASE_ANON_KEY também é aceito
// ------------------------------------------------------------------

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  'https://rxtwmwrgcilmsldtqdfe.supabase.co';

// Prioriza VITE_SUPABASE_KEY, mas aceita VITE_SUPABASE_ANON_KEY por compatibilidade
const SUPABASE_KEY =
  (import.meta as any).env?.VITE_SUPABASE_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_jpVmCuQ3xmbWWcvgHn_H3g_Vypfyw0x';

let client: any;
let isDemoMode = false;

// Dummy client (não derruba o app)
const createDummyClient = () =>
  ({
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),

      // Auth “falso” no demo
      signInWithPassword: async () => ({
        data: null,
        error: { message: 'Modo Demo: configure o Supabase para logar.' },
      }),
      signUp: async () => ({
        data: null,
        error: { message: 'Modo Demo: configure o Supabase para cadastrar.' },
      }),
      resetPasswordForEmail: async () => ({
        data: null,
        error: { message: 'Modo Demo: configure o Supabase para recuperar senha.' },
      }),
      signInWithOAuth: async () => ({
        data: null,
        error: { message: 'Modo Demo: configure o Supabase para login social.' },
      }),
      signOut: async () => ({ error: null }),
      exchangeCodeForSession: async () => ({ data: null, error: null }),
      updateUser: async () => ({ data: null, error: null }),
    },
    from: () => ({
      select: async () => ({ data: null, error: { code: 'NOT_CONFIGURED' } }),
      insert: async () => ({ data: null, error: { code: 'NOT_CONFIGURED' } }),
      update: async () => ({ data: null, error: { code: 'NOT_CONFIGURED' } }),
      delete: async () => ({ data: null, error: { code: 'NOT_CONFIGURED' } }),
    }),
  } as any);

function looksLikeSupabaseKey(key: string | undefined | null) {
  if (!key) return false;
  // keys antigas anon: eyJ...
  // keys novas publishable: sb_publishable_...
  return key.startsWith('eyJ') || key.startsWith('sb_publishable_');
}

try {
  if (SUPABASE_URL && looksLikeSupabaseKey(SUPABASE_KEY)) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // importante pro OAuth (Google)
      },
    });
  } else {
    console.warn(
      'Supabase URL/KEY ausentes ou inválidas. Rodando em DEMO mode.',
      { hasUrl: !!SUPABASE_URL, keyPrefix: (SUPABASE_KEY || '').slice(0, 20) }
    );
    client = createDummyClient();
    isDemoMode = true;
  }
} catch (error) {
  console.error('Falha ao inicializar Supabase client:', error);
  client = createDummyClient();
  isDemoMode = true;
}

export const supabase = client;

// Teste simples de conexão (não valida RLS)
export const testConnection = async () => {
  if (isDemoMode) return false;

  try {
    // chamada leve: se responder, conexão ok
    await supabase.auth.getSession();
    return true;
  } catch (e) {
    console.error('Supabase Connection Exception:', e);
    return false;
  }
};
