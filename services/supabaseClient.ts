import { createClient } from "@supabase/supabase-js";

// Helper seguro para ler variáveis de ambiente no Vite
const getEnvVar = (key: string): string | undefined => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    console.warn('Ambiente não suporta import.meta.env ou variável ausente');
  }
  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Verifica se a configuração está completa
export const isConfigured = !!(supabaseUrl && supabaseAnonKey);

// Inicializa o cliente apenas se configurado corretamente
// Se não houver chaves, 'supabase' será null, permitindo fallback para modo Mock/Demo
export const supabase = isConfigured 
  ? createClient(supabaseUrl as string, supabaseAnonKey as string) 
  : null;

// Funções legadas mantidas para compatibilidade de interface
export const saveSupabaseConfig = (url: string, key: string) => {
  console.warn("A configuração manual foi desativada. Use variáveis de ambiente (arquivo .env).");
};

export const clearSupabaseConfig = () => {
    // No-op
}

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