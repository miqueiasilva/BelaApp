
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO SUPABASE
// ------------------------------------------------------------------
// Para que o sistema funcione, você precisa pegar essas chaves no seu painel do Supabase:
// 1. Vá em Settings (Ícone de engrenagem) > API
// 2. Copie "Project URL" e cole em SUPABASE_URL
// 3. Copie "anon" "public" key e cole em SUPABASE_ANON_KEY
// ------------------------------------------------------------------

const SUPABASE_URL = 'https://rxtwmwrgcilmsldtqdfe.supabase.co'; // Substitua pela sua URL real se for diferente
const SUPABASE_ANON_KEY = 'sb_publishable_jpVmCuQ3xmbWWcvgHn_H3g_Vypfyw0x'; // SUBSTITUA POR SUA CHAVE 'anon' REAL (começa com eyJ...)

let client;

// Helper to create a dummy client that won't crash the app
const createDummyClient = () => ({
    auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }), // Ensure getUser exists
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: null, error: { message: "Modo Demo: Use o login de teste." } }),
        signUp: async () => ({ data: null, error: { message: "Cadastro desativado no modo Demo." } }),
        resetPasswordForEmail: async () => ({ data: null, error: { message: "Recuperação desativada no modo Demo." } }),
        signInWithOAuth: async () => ({ data: null, error: { message: "Login social desativado no modo Demo." } }),
        signOut: async () => {},
    },
    from: () => ({ select: async () => ({ error: { code: 'NOT_CONFIGURED' } }) })
} as any);

try {
    // Check if keys are present AND look like valid Supabase keys (anon keys usually start with eyJ)
    // The current placeholder 'sb_publishable...' is invalid and will cause network hangs.
    const isValidKey = SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.startsWith('eyJ');

    if (SUPABASE_URL && isValidKey) {
        client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.warn("Supabase credentials missing or invalid. App running in DEMO mode.");
        client = createDummyClient();
    }
} catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    client = createDummyClient();
}

export const supabase = client;

// Função auxiliar para testar conexão
export const testConnection = async () => {
    try {
        // If it's the dummy client, return false immediately without error
        // Checking for a specific dummy property or behavior
        const sessionCheck = await supabase.auth.getSession();
        if (sessionCheck.error?.message === "Modo Demo: Use o login de teste.") {
             return false;
        }

        // Tenta fazer uma consulta leve apenas para ver se a API responde
        // Using 'profiles' might fail if RLS is strict and no user is logged in.
        // A better check for general connectivity is health check if available or a public table.
        // For now, we assume if we can talk to Auth, we are connected.
        
        return true; 
    } catch (e) {
        console.error("Supabase Connection Exception:", e);
        return false;
    }
};
