
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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função auxiliar para testar conexão
export const testConnection = async () => {
    try {
        // Tenta fazer uma consulta leve apenas para ver se a API responde
        // Usamos 'from' em uma tabela que sabemos que existe ou apenas verificamos a sessão
        const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        
        // Se der erro de permissão (401) ou conexão, retornamos false
        if (error && error.code !== 'PGRST116') { // PGRST116 é "retornou 0 linhas", o que significa que conectou mas tá vazio
             console.error("Supabase Connection Error:", error);
             return false;
        }
        return true;
    } catch (e) {
        console.error("Supabase Connection Exception:", e);
        return false;
    }
};
