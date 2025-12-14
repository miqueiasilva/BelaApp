
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Lock, Mail, Eye, EyeOff, ArrowRight, CheckCircle2, XCircle, User, ArrowLeft, Send, Github, Database } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot';

const LoginView: React.FC = () => {
    const { signIn, signUp, resetPassword, signInWithGoogle, signInWithGithub } = useAuth();
    
    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(''); // For registration
    
    // UI State
    const [mode, setMode] = useState<AuthMode>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const resetForm = () => {
        setError(null);
        setSuccessMessage(null);
        setPassword('');
        // Keep email populated as it's often reused
    };

    const handleModeChange = (newMode: AuthMode) => {
        resetForm();
        setMode(newMode);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        try {
            if (mode === 'login') {
                const result = await signIn(email, password);
                if (result.error) setError(result.error);
            } else if (mode === 'register') {
                if (!name) {
                    setError("Por favor, informe seu nome.");
                    setIsLoading(false);
                    return;
                }
                const result = await signUp(email, password, name);
                if (result.error) {
                    setError(result.error);
                } else {
                    setSuccessMessage("Conta criada com sucesso! Verifique seu e-mail para confirmar.");
                    // Optional: Switch to login or keep showing success
                }
            } else if (mode === 'forgot') {
                const result = await resetPassword(email);
                if (result.error) {
                    setError(result.error);
                } else {
                    setSuccessMessage("Se o e-mail estiver cadastrado, você receberá um link de recuperação.");
                }
            }
        } catch (err) {
            setError("Ocorreu um erro inesperado. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setIsLoading(true);
        await signInWithGoogle();
    };

    const handleGithubLogin = async () => {
        setError(null);
        setIsLoading(true);
        await signInWithGithub();
    };

    // --- Render Helpers ---

    const getTitle = () => {
        switch (mode) {
            case 'register': return 'Criar Conta';
            case 'forgot': return 'Recuperar Senha';
            default: return 'Bem-vindo ao BelaApp';
        }
    };

    const getSubtitle = () => {
        switch (mode) {
            case 'register': return 'Comece a gerenciar seu estúdio hoje';
            case 'forgot': return 'Informe seu e-mail para receber o link';
            default: return 'Gestão Inteligente para Estúdios de Beleza';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-0 -right-32 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-32 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-slate-800/50 rounded-full blur-3xl opacity-40"></div>
            </div>

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 transition-all duration-300">
                    
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-tr from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
                            <span className="text-white font-bold text-3xl">B</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">{getTitle()}</h1>
                        <p className="text-slate-300 text-sm">{getSubtitle()}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-200 text-sm text-center flex items-center justify-center gap-2">
                                <XCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                        {successMessage && (
                            <div className="p-3 bg-green-500/10 border border-green-500/50 rounded-xl text-green-200 text-sm text-center flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                {successMessage}
                            </div>
                        )}

                        {mode === 'register' && (
                            <div className="space-y-1 animate-in slide-in-from-left-4 fade-in">
                                <label className="text-xs font-semibold text-slate-300 uppercase ml-1">Nome Completo</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-slate-400 group-focus-within:text-white transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                        placeholder="Seu Nome"
                                        required={mode === 'register'}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-300 uppercase ml-1">E-mail</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-white transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    placeholder="seu@email.com"
                                    required
                                />
                            </div>
                        </div>

                        {(mode === 'login' || mode === 'register') && (
                            <div className="space-y-1 animate-in slide-in-from-right-4 fade-in">
                                <label className="text-xs font-semibold text-slate-300 uppercase ml-1">Senha</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-white transition-colors" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-10 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                        placeholder="••••••"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {mode === 'login' && (
                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center text-slate-300 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900" />
                                    <span className="ml-2">Lembrar de mim</span>
                                </label>
                                <button type="button" onClick={() => handleModeChange('forgot')} className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
                                    Esqueceu a senha?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-orange-500/20 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-slate-900 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                <>
                                    {mode === 'login' && <>Entrar no Sistema <ArrowRight className="h-5 w-5" /></>}
                                    {mode === 'register' && <>Criar Conta <CheckCircle2 className="h-5 w-5" /></>}
                                    {mode === 'forgot' && <>Enviar Link <Send className="h-4 w-4" /></>}
                                </>
                            )}
                        </button>
                        
                        {/* Secondary Actions */}
                        <div className="flex justify-center mt-2">
                            {mode === 'login' ? (
                                <p className="text-sm text-slate-400">
                                    Não tem uma conta? <button type="button" onClick={() => handleModeChange('register')} className="text-white font-bold hover:underline">Cadastre-se</button>
                                </p>
                            ) : (
                                <button type="button" onClick={() => handleModeChange('login')} className="text-sm text-slate-400 flex items-center gap-1 hover:text-white transition-colors">
                                    <ArrowLeft className="w-4 h-4" /> Voltar para o login
                                </button>
                            )}
                        </div>
                    </form>
                </div>
                
                <p className="mt-8 text-center text-xs text-slate-500">
                    &copy; 2025 BelaApp. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
};

export default LoginView;
