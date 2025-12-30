
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';

export type AppUser = SupabaseUser & {
  papel?: string;
  nome?: string;
  avatar_url?: string;
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

  // Busca perfil com proteção contra travamento (Timeout de 7s para o perfil especificamente)
  const fetchProfile = async (authUser: SupabaseUser): Promise<AppUser> => {
    const profilePromise = supabase
      .from('profiles')
      .select('full_name, papel, avatar_url')
      .eq('id', authUser.id)
      .maybeSingle();

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Profile Timeout")), 7000)
    );

    try {
      // Race entre o banco e um timeout de 7 segundos
      const { data, error }: any = await Promise.race([profilePromise, timeoutPromise]);

      if (error || !data) {
        return {
            ...authUser,
            papel: 'admin',
            nome: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
            avatar_url: authUser.user_metadata?.avatar_url
        };
      }

      return {
        ...authUser,
        papel: data.papel || 'profissional',
        nome: data.full_name || authUser.user_metadata?.full_name,
        avatar_url: data.avatar_url || authUser.user_metadata?.avatar_url
      };
    } catch (e) {
      console.warn("AuthContext: Perfil demorou muito ou falhou. Usando dados básicos do JWT.");
      return { 
        ...authUser, 
        papel: (authUser as any).papel || 'admin', 
        nome: authUser.user_metadata?.full_name || 'Usuário' 
      };
    }
  };

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      setLoading(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("AuthContext: Erro ao recuperar sessão inicial:", error.message);
          // Se o erro for de token inválido, limpa tudo para não travar
          if (error.message.toLowerCase().includes('refresh_token')) {
            await supabase.auth.signOut();
            if (mounted) setUser(null);
          }
          return;
        }

        if (session?.user && mounted) {
          const appUser = await fetchProfile(session.user);
          setUser(appUser);
        }
      } catch (err) {
        console.error("AuthContext: Erro crítico na inicialização:", err);
      } finally {
        // GARANTIA ABSOLUTA: O loading sempre termina, aconteça o que acontecer
        if (mounted) setLoading(false);
      }
    };

    getInitialSession();

    // Listener de mudanças de estado
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const appUser = await fetchProfile(session.user);
        if (mounted) setUser(appUser);
      } else {
        if (mounted) setUser(null);
      }
      
      // Se houve um evento de logout ou erro, garante o fim do loading
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, name: string) => {
    return await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { full_name: name } }
    });
  };

  const signInWithGoogle = async () => {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
  };

  const resetPassword = async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  };

  const updatePassword = async (newPassword: string) => {
    return await supabase.auth.updateUser({ password: newPassword });
  };

  const signOut = async () => {
    try {
        setLoading(true);
        await supabase.auth.signOut();
    } finally {
        setUser(null);
        setLoading(false);
        localStorage.clear();
        sessionStorage.clear();
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
    signOut,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
