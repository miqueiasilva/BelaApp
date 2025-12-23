
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';

// Extended User type to include role/papel
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

  // Helper to fetch extra profile data from 'public.profiles'
  const fetchProfile = async (authUser: SupabaseUser): Promise<AppUser> => {
    try {
      // Timeout interno para a consulta de perfil não travar a autenticação
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, papel, avatar_url')
        .eq('id', authUser.id)
        .maybeSingle();

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
      return { ...authUser, papel: 'admin', nome: authUser.email?.split('@')[0] };
    }
  };

  useEffect(() => {
    let mounted = true;

    // FAIL-SAFE: Se em 3 segundos o Supabase não responder, liberamos a tela
    // Isso evita que o usuário fique preso no "Sincronizando" por erros de rede/CORS
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("AuthContext: Timeout de segurança atingido. Forçando encerramento do loading.");
        setLoading(false);
      }
    }, 3000);

    const getInitialSession = async () => {
      try {
        if (!supabase) {
           if (mounted) setLoading(false);
           return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session?.user && mounted) {
          const appUser = await fetchProfile(session.user);
          setUser(appUser);
        }
      } catch (error) {
        console.error("Auth init error:", error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      }
    };

    getInitialSession();

    // Listener para mudanças de estado (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        const appUser = await fetchProfile(session.user);
        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
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
        options: {
            data: { full_name: name }
        }
    });
  };

  const signInWithGoogle = async () => {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
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
      await supabase.auth.signOut();
    } finally {
      setUser(null);
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
