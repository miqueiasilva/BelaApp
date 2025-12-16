import { createClient } from "@supabase/supabase-js";

// Helper para ler variáveis de ambiente de forma segura no Vite
const getEnvVar = (key: string): string | undefined => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    console.warn('Ambiente não suporta import.meta.env');
  }
  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Verifica se a configuração está completa
// Se false, o app deve operar em modo "Mock/Demo" sem travar
export const isConfigured = !!(supabaseUrl && supabaseAnonKey);

// Inicializa o cliente apenas se configurado corretamente
// Se não houver chaves, 'supabase' será null, e o resto do app deve lidar com isso (usando AuthContext mockado ou dados locais)
export const supabase = isConfigured 
  ? createClient(supabaseUrl as string, supabaseAnonKey as string) 
  : null;

// Funções legadas mantidas para compatibilidade, mas sem efeito real de persistência insegura
export const saveSupabaseConfig = (url: string, key: string) => {
  console.warn("A configuração manual foi desativada. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env ou no painel da Vercel.");
};

export const clearSupabaseConfig = () => {
    // No-op
}

// Teste de conexão seguro
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