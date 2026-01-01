
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export type AppUser = SupabaseUser & {
  papel?: string;
  nome?: string;
  avatar_url?: string;
  permissions?: any;
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children?: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  // Busca perfil estendido (DB) sem bloquear a UI se já estiver carregado
  const fetchProfile = async (authUser: SupabaseUser): Promise<AppUser> => {
    try {
      // Prioridade 1: Tabela de Profissionais (Equipe)
      const { data: profData } = await supabase
        .from('professionals')
        .select('role, photo_url, permissions, name')
        .eq('email', authUser.email)
        .maybeSingle();

      if (profData) {
        return {
          ...authUser,
          papel: profData.role?.toLowerCase() || 'profissional',
          nome: profData.name || authUser.user_metadata?.full_name,
          avatar_url: profData.photo_url || authUser.user_metadata?.avatar_url,
          permissions: profData.permissions
        };
      }

      // Prioridade 2: Tabela de Profiles (Admin/Outros)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, papel, avatar_url')
        .eq('id', authUser.id)
        .maybeSingle();

      return {
        ...authUser,
        papel: profileData?.papel || 'profissional',
        nome: profileData?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
        avatar_url: profileData?.avatar_url || authUser.user_metadata?.avatar_url
      };
    } catch (e) {
      return { 
        ...authUser, 
        papel: 'profissional', 
        nome: authUser.user_metadata?.full_name || 'Usuário' 
      };
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // 1. Verificação Otimista: Se não há token, não mostramos spinner por muito tempo
        const storageKey = Object.keys(localStorage).find(k => k.includes('-auth-token'));
        if (!storageKey || !localStorage.getItem(storageKey)) {
          if (mounted) setLoading(false);
        }

        // 2. Busca Real da Sessão
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (initialSession?.user && mounted) {
          setSession(initialSession);
          const appUser = await fetchProfile(initialSession.user);
          if (mounted) setUser(appUser);
        }
      } catch (err) {
        console.error("AuthContext Boot Error:", err);
      } finally {
        // Liberação do Boot Inicial
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // 3. Listener de Eventos (Atualizações Silenciosas)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      console.log("AuthContext Event:", event);

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (currentSession?.user) {
          setSession(currentSession);
          const appUser = await fetchProfile(currentSession.user);
          if (mounted) setUser(appUser);
        }
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // --- O SEGREDO: Atualização Silenciosa ---
        // Se a aba acordar do background, atualizamos o user mas NÃO ativamos o spinner
        if (currentSession?.user) {
          setSession(currentSession);
          const appUser = await fetchProfile(currentSession.user);
          if (mounted) setUser(appUser);
        }
        // Garante que se o loading estivesse travado por algum motivo, ele seja liberado
        setLoading(false);
      }
    });

    // 4. DISJUNTOR DE SEGURANÇA (Visibility Fail-Safe)
    // Se o usuário volta para a aba, garantimos que qualquer "loading residual" seja limpo
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Se após 500ms de volta na tela o loading ainda estiver true, forçamos o falso.
        setTimeout(() => {
          if (mounted && loading) {
            console.warn("AuthContext: Force-unlocking UI after background resume.");
            setLoading(false);
          }
        }, 500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loading]); // Adicionado loading como dependência para o timeout monitorar o estado real

  const signIn = async (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });
  const signUp = async (email: string, password: string, name: string) => supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
  const signInWithGoogle = async () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/` } });
  const resetPassword = async (email: string) => supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
  const updatePassword = async (newPassword: string) => supabase.auth.updateUser({ password: newPassword });
  
  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (error) {
      console.error("AuthContext Logout Error:", error);
    } finally {
      setUser(null);
      setSession(null);
      localStorage.clear();
      setLoading(false);
      window.location.href = '/'; 
    }
  };

  const value = useMemo(() => ({ 
    user, 
    loading, 
    signIn, 
    signUp, 
    signInWithGoogle, 
    resetPassword, 
    updatePassword, 
    signOut 
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
