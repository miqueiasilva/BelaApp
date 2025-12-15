
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabaseClient";

type AppUser = {
  id: string;
  email?: string | null;
  papel?: string | null;   // <- vem do profiles
  nome?: string | null;    // opcional
};

type AuthCtx = {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

async function fetchProfile(userId: string) {
  // Ajuste os campos conforme sua tabela profiles
  const { data, error } = await supabase
    .from("profiles")
    .select("id, papel, nome")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data; // pode ser null se não existir
}

async function ensureProfileExists(userId: string, email?: string | null) {
  // cria perfil se não existir
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existing?.id) return;

  // Ajuste valores default como você quiser
  const { error } = await supabase.from("profiles").insert({
    id: userId,
    papel: "admin",
    nome: email ?? "Usuário",
  });

  if (error) throw error;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const authUser = data.user;

      if (!authUser) {
        setUser(null);
        return;
      }

      // garante que tenha profile
      await ensureProfileExists(authUser.id, authUser.email);

      const profile = await fetchProfile(authUser.id);

      setUser({
        id: authUser.id,
        email: authUser.email,
        papel: prof
