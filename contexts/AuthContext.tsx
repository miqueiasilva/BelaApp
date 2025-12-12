
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
    user: User | null;
    signIn: (email: string, pass: string) => Promise<{ error: string | null }>;
    signInWithGoogle: () => Promise<{ error: string | null }>;
    signInWithGithub: () => Promise<{ error: string | null }>;
    signOut: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session on load
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    mapSupabaseUserToAppUser(session.user);
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error checking session:", error);
                setLoading(false);
            }
        };

        checkSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                mapSupabaseUserToAppUser(session.user);
            } else {
                // Only clear user if we are not currently logged in as the demo user
                // This prevents the auth listener from logging out our fake demo session
                setUser(currentUser => {
                    if (currentUser?.id === 'demo-admin-id') return currentUser;
                    return null;
                });
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const mapSupabaseUserToAppUser = (supaUser: any) => {
        // In a real production app, we would fetch the 'role' from a 'profiles' table.
        // For now, we default to 'admin' to ensure access to the dashboard features.
        // We also check user_metadata for stored names/avatars.
        const appUser: User = {
            id: supaUser.id,
            nome: supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || supaUser.email?.split('@')[0] || 'Usuário',
            email: supaUser.email || '',
            papel: (supaUser.user_metadata?.role as UserRole) || 'admin', 
            avatar_url: supaUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${supaUser.email}`,
            ativo: true
        };
        setUser(appUser);
        setLoading(false);
    };

    const signIn = async (email: string, pass: string) => {
        setLoading(true);

        // --- DEMO BYPASS ---
        // Allows access if the backend user hasn't been created yet.
        if (email === 'admin@bela.com' && pass === '123123') {
            // Simulate network delay for realism
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const demoUser: User = {
                id: 'demo-admin-id',
                nome: 'Admin Demo',
                email: 'admin@bela.com',
                papel: 'admin',
                avatar_url: 'https://i.pravatar.cc/150?img=12',
                ativo: true
            };
            setUser(demoUser);
            setLoading(false);
            return { error: null };
        }
        // -------------------

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password: pass,
            });

            if (error) {
                setLoading(false);
                return { error: 'E-mail ou senha incorretos.' };
            }

            // State update handled by onAuthStateChange
            return { error: null };
        } catch (err) {
            setLoading(false);
            return { error: 'Ocorreu um erro ao tentar fazer login.' };
        }
    };

    const signInWithGoogle = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });

            if (error) throw error;
            return { error: null };
        } catch (err) {
            setLoading(false);
            return { error: 'Erro ao conectar com Google.' };
        }
    };

    const signInWithGithub = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: window.location.origin
                }
            });

            if (error) throw error;
            return { error: null };
        } catch (err) {
            setLoading(false);
            return { error: 'Erro ao conectar com GitHub.' };
        }
    };

    const signOut = async () => {
        setLoading(true);
        // If demo user, just clear state
        if (user?.id === 'demo-admin-id') {
            setUser(null);
            setLoading(false);
            return;
        }
        
        await supabase.auth.signOut();
        // State update handled by onAuthStateChange
    };

    return (
        <AuthContext.Provider value={{ user, signIn, signInWithGoogle, signInWithGithub, signOut, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
