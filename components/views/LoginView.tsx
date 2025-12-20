
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
    Loader2, Eye, EyeOff, Mail, Lock, ArrowRight, XCircle, CheckCircle2 
} from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.29-2.29-2.55z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const LoginView: React.FC = () => {
    const { signIn, signUp, resetPassword, signInWithGoogle } = useAuth();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    
    const [mode, setMode] = useState<AuthMode>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // FIX: Limpa estados de sessão e loading ao montar o componente
    useEffect(() => {
        setIsLoading(false);
        setError(null);
    }, []);

    const handleModeChange = (newMode: AuthMode) => {
        setError(null);
        setSuccessMessage(null);
        setMode(newMode);
        setIsLoading(false);
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const { error } = await signInWithGoogle();
            if (error) throw error;
        } catch (err: any) {
            setError("Conexão com Google falhou.");
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        try {
            if (mode === 'login') {
                const { error } = await signIn(email, password);
                if (error) throw error;
            } else if (mode === 'register') {
                const { error } = await signUp(email, password, name);
                if (error) throw error;
                setSuccessMessage("Conta criada! Verifique seu e-mail.");
                setIsLoading(false); // Libera para o usuário ver a mensagem
            } else if (mode === 'forgot') {
                const { error } = await resetPassword(email);
                if (error) throw error;
                setSuccessMessage("Instruções enviadas.");
                setIsLoading(false);
            }
        } catch (err: any) {
            // FIX: Garante que erros de credenciais desativem o estado de carregamento
            setError(err.message || "Erro de autenticação. Verifique seus dados.");
            setIsLoading(false);
        } finally {
            // Caso especial: se não houver erro no login, o AuthContext redirecionará o App.
            // Mas se cair aqui por qualquer outro motivo, liberamos o botão.
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-black font-sans">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,_#1e1b4b_0%,_#09090b_70%,_#000000_100%)] z-0"></div>
            
            <div className="w-full max-w-[460px] relative z-10">
                <div className="bg-white/[0.04] backdrop-blur-[18px] border border-white/10 rounded-[44px] p-8 md:p-14 shadow-2xl overflow-y-auto max-h-[95vh] scrollbar-hide animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#FF8C42] to-[#F43F5E] rounded-[22px] flex items-center justify-center shadow-lg mb-5">
                            <span className="text-white font-black text-4xl">B</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">BelaApp</h1>
                        <p className="text-slate-200/80 text-sm text-center font-medium">Gestão Inteligente para Salões</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-3 rounded-2xl animate-in shake duration-300">
                            <XCircle size={16} />
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="mb-6 p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-3 rounded-2xl">
                            <CheckCircle2 size={16} />
                            {successMessage}
                        </div>
                    )}

                    {mode === 'login' && (
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-bold py-4 rounded-[20px] hover:bg-slate-50 transition-all active:scale-[0.97] disabled:opacity-50 mb-8 shadow-xl"
                        >
                            <GoogleIcon />
                            <span>Entrar com Google</span>
                        </button>
                    )}

                    <div className="relative flex items-center py-2 mb-8">
                        <div className="flex-grow border-t border-white/10"></div>
                        <span className="flex-shrink-0 mx-6 text-[10px] font-black text-slate-200/60 uppercase tracking-[0.25em]">ACESSO RÁPIDO</span>
                        <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {mode === 'register' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-2">Nome Completo</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-[18px] px-6 py-4 text-white outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
                                    placeholder="Seu nome"
                                    required
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-2">E-mail Corporativo</label>
                            <div className="relative">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-[18px] pl-14 pr-6 py-4 text-white outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
                                    placeholder="exemplo@email.com"
                                    required
                                />
                            </div>
                        </div>

                        {mode !== 'forgot' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-2">Senha Segura</label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-[18px] pl-14 pr-14 py-4 text-white outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-[#FF8C42] to-[#F43F5E] text-white font-black py-4.5 rounded-[22px] shadow-lg transition-all active:scale-[0.97] disabled:opacity-70 flex items-center justify-center gap-3 mt-8"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin h-6 w-6" />
                            ) : (
                                <>
                                    <span>{mode === 'login' ? 'Entrar no Sistema' : mode === 'register' ? 'Criar Conta' : 'Recuperar'}</span>
                                    <ArrowRight size={22} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 text-center">
                        {mode === 'login' ? (
                            <p className="text-sm text-slate-400 font-medium">
                                Novo por aqui?{' '}
                                <button type="button" onClick={() => handleModeChange('register')} className="text-white font-black hover:text-[#FF8C42] transition-colors underline underline-offset-4">Cadastre-se</button>
                            </p>
                        ) : (
                            <button type="button" onClick={() => handleModeChange('login')} className="text-sm text-slate-300 font-bold hover:text-white transition-all bg-white/5 px-6 py-2.5 rounded-full">Voltar ao Login</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
