
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function ResetPasswordView() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        setStatus('error');
        setMsg('A senha deve ter no mínimo 6 caracteres.');
        return;
    }
    if (password !== confirmPassword) {
        setStatus('error');
        setMsg('As senhas não coincidem.');
        return;
    }

    setStatus('loading');
    const { error } = await updatePassword(password);
    
    if (error) {
        setStatus('error');
        setMsg(error.message);
    } else {
        setStatus('success');
        setMsg('Senha atualizada! Redirecionando...');
        setTimeout(() => window.location.hash = '', 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Redefinir Senha</h2>
        <p className="text-slate-500 mb-6 text-sm">Digite sua nova senha abaixo.</p>

        {status === 'success' ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="font-bold text-green-800">Sucesso!</h3>
                <p className="text-green-700 text-sm">{msg}</p>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
                {status === 'error' && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                        <AlertTriangle size={16} /> {msg}
                    </div>
                )}
                
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nova Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                            placeholder="••••••"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                        <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                            placeholder="••••••"
                        />
                    </div>
                </div>

                <button 
                    disabled={status === 'loading'}
                    className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition flex items-center justify-center gap-2 disabled:opacity-70"
                >
                    {status === 'loading' ? 'Salvando...' : 'Atualizar Senha'}
                    {status !== 'loading' && <ArrowRight size={18} />}
                </button>
            </form>
        )}
      </div>
    </div>
  );
}
