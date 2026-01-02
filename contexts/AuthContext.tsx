
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

  // Helper para buscar perfil detalhado (Papel, Nome, Avatar)
  const fetchProfile = async (authUser: SupabaseUser): Promise<AppUser> => {
    try {
      // Tenta buscar na tabela de profissionais primeiro (Equipe)
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

      // Fallback para tabela de perfis genérica
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
      console.warn("AuthContext: Erro ao buscar perfil, usando dados básicos.", e);
      return { 
        ...authUser, 
        papel: 'profissional', 
        nome: authUser.user_metadata?.full_name || 'Usuário' 
      };
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Função de Inicialização (Boot)
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (initialSession?.user && mounted) {
          setSession(initialSession);
          const appUser = await fetchProfile(initialSession.user);
          if (mounted) setUser(appUser);
        }
      } catch (err) {
        console.error("AuthContext: Erro no boot inicial:", err);
      } finally {
        // GARANTIA: Libera a tela inicial independente do resultado
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // 2. Escuta mudanças de Estado (Login, Logout, Refresh, Foco de Aba)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth Event:", event);
      
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (currentSession?.user) {
          setSession(currentSession);
          // Busca o perfil em background sem travar a UI (Non-Blocking)
          fetchProfile(currentSession.user).then(appUser => {
            if (mounted) setUser(appUser);
          });
        }
        // Destrava o loading se estiver preso
        setLoading(false);
      }
    });

    // 3. SAFETY TIMEOUT (Botão de Pânico)
    // Se em 4 segundos o Supabase não responder, forçamos o fim do loading
    // para que o usuário não fique preso em uma tela branca infinita.
    const safetyTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn("AuthContext: Safety timeout atingido. Forçando desbloqueio da UI.");
        setLoading(false);
      }
    }, 4000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const signIn = async (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });
  const signUp = async (email: string, password: string, name: string) => supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
  const signInWithGoogle = async () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/` } });
  const resetPassword = async (email: string) => supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
  const updatePassword = async (newPassword: string) => supabase.auth.updateUser({ password: newPassword });
  
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    } finally {
      // Limpeza forçada total em caso de falha de rede
      localStorage.clear(); 
      sessionStorage.clear();
      setUser(null);
      setSession(null);
      setLoading(false);
      window.location.href = '/login'; 
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
