
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { testConnection } from '../../services/supabaseClient';
import { Loader2, Lock, Mail, Eye, EyeOff, ArrowRight, Database, CheckCircle2, XCircle } from 'lucide-react';

const LoginView: React.FC = () => {
    const { signIn, signInWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    
    // Estado da Conexão
    const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');

    useEffect(() => {
        const checkDb = async () => {
            const isConnected = await testConnection();
            setDbStatus(isConnected ? 'connected' : 'error');
        };
        checkDb();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const result = await signIn(email, password);
        
        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setIsLoading(true);
        await signInWithGoogle();
        // Context handles state update
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
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8">
                    
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-tr from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
                            <span className="text-white font-bold text-3xl">B</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Bem-vindo ao BelaApp</h1>
                        <p className="text-slate-300 text-sm">Gestão Inteligente para Estúdios de Beleza</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">
                                {error}
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
                                    placeholder="admin@bela.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
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

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center text-slate-300 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900" />
                                <span className="ml-2">Lembrar de mim</span>
                            </label>
                            <a href="#" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
                                Esqueceu a senha?
                            </a>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-orange-500/20 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-slate-900 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                <>
                                    Entrar no Sistema <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* DB Status Indicator */}
                    <div className={`mt-6 p-3 rounded-lg border flex items-center justify-center gap-2 text-xs font-medium transition-colors ${
                        dbStatus === 'checking' ? 'bg-slate-800/50 border-slate-700 text-slate-400' :
                        dbStatus === 'connected' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                        'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                        {dbStatus === 'checking' && (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" /> Verificando conexão...
                            </>
                        )}
                        {dbStatus === 'connected' && (
                            <>
                                <CheckCircle2 className="w-3 h-3" /> Banco de Dados Conectado
                            </>
                        )}
                        {dbStatus === 'error' && (
                            <>
                                <XCircle className="w-3 h-3" /> Erro de Conexão com Supabase
                            </>
                        )}
                    </div>

                    <div className="mt-4 text-center text-sm text-slate-400">
                        <p>Login de Teste: <b>admin@bela.com</b> / <b>123123</b></p>
                    </div>
                </div>
                
                <p className="mt-8 text-center text-xs text-slate-500">
                    &copy; 2025 BelaApp. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
};

export default LoginView;
