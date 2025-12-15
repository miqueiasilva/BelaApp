// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';

type AppUser = {
  id: string;
  email?: string | null;
  papel?: string; // seu App.tsx usa isso
  [key: string]: any;
} | null;

type AuthContextType = {
  user: AppUser;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
  updatePassword: (newPassword: string) => Promise<any>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchProfile(userId: string) {
  // Se você tiver outra tabela/colunas, ajuste aqui
  const { data, error } = await supabase
    .from('profiles')
    .select('id, papel, full_name')
    .eq('id', userId)
    .maybeSingle();

  // se não existir profile ainda, devolve null sem quebrar
  if (error) return null;
  return data ?? null;
}

function buildRedirectBase() {
  // mantém compatível com hash routing
  return window.location.origin;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser>(null);
  const [loading, setLoading] = useState(true);

  const hydrateUser = async () => {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData?.session?.user ?? null;

    if (!authUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    const profile = await fetchProfile(authUser.id);

    // IMPORTANT: garante papel pra seu hasAccess()
    setUser({
      ...authUser,
      papel: profile?.papel ?? 'admin',
      full_name: profile?.full_name ?? authUser.user_metadata?.full_name ?? null,
    });

    setLoading(false);
  };

  useEffect(() => {
    hydrateUser();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event) => {
      await hydrateUser();
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const signIn = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp = async (email: string, password: string) => {
    // Depois do signup você pode criar o profile via trigger no banco (recomendado).
    return supabase.auth.signUp({ email, password });
  };

  const signInWithGoogle = () => {
    const redirectTo = buildRedirectBase(); // volta pro app
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  };

  const resetPassword = (email: string) => {
    // manda para tela hash de reset
    const redirectTo = `${buildRedirectBase()}/#/reset-password`;
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
  };

  const updatePassword = (newPassword: string) => {
    // usado na tela /#/reset-password
    return supabase.auth.updateUser({ password: newPassword });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      updatePassword,
      signOut,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
