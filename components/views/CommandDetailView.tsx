
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, CreditCard, Smartphone, Banknote, Loader2, CheckCircle, User, Briefcase, ShoppingCart, X, Receipt, Coins, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useStudio } from '../../contexts/StudioContext';
import Toast, { ToastType } from '../shared/Toast';
// ✅ CORREÇÃO: Importação faltante do componente Card
import Card from '../shared/Card';

interface CommandDetailViewProps {
    commandId: string;
    onBack: () => void;
}

const CommandDetailView: React.FC<CommandDetailViewProps> = ({ commandId, onBack }) => {
    const { activeStudioId } = useStudio();
    const isMounted = useRef(true);
    const [loading, setLoading] = useState(true);
    const [isFinishing, setIsFinishing] = useState(false);
    const [isSuccessfullyClosed, setIsSuccessfullyClosed] = useState(false);
    const [command, setCommand] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [dbMethods, setDbMethods] = useState<any[]>([]);
    const [addedPayments, setAddedPayments] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<'credit' | 'debit' | 'pix' | 'money' | null>(null);
    const [amountToPay, setAmountToPay] = useState<string>('0');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        isMounted.current = true;
        const fetchContext = async () => {
            if (!activeStudioId || !commandId) return;
            setLoading(true);
            try {
                // RPC de Contexto (Busca Comanda + Itens + Métodos em uma única rede)
                const { data, error } = await supabase.rpc('get_checkout_context', { p_command_id: commandId });
                if (error) throw error;
                if (isMounted.current) {
                    setCommand(data.command);
                    setItems(data.items || []);
                    setDbMethods(data.methods || []);
                    if (data.command.status === 'paid') setIsSuccessfullyClosed(true);
                }
            } catch (e: any) {
                console.error(e);
                if (isMounted.current) setToast({ message: "Erro ao carregar dados da comanda.", type: 'error' });
            } finally {
                if (isMounted.current) setLoading(false);
            }
        };
        fetchContext();
        return () => { isMounted.current = false; };
    }, [commandId, activeStudioId]);

    const handleFinishPayment = async () => {
        if (!command || isFinishing || addedPayments.length === 0) return;
        setIsFinishing(true);
        try {
            const methodMap: Record<string, string> = { 'money': 'cash', 'credit': 'credit', 'debit': 'debit', 'pix': 'pix' };

            for (const p of addedPayments) {
                // ✅ CHAMADA OBRIGATÓRIA DA V2 (NORMALIZADA NO DB)
                const { error } = await supabase.rpc('register_payment_transaction_v2', {
                    p_studio_id: activeStudioId,
                    p_professional_id: command.professional_id, // Já normalizado via trigger no DB
                    p_amount: Number(p.amount),
                    p_method: methodMap[p.method as keyof typeof methodMap],
                    p_brand: p.brand || 'MULTI_PAGAMENTO',
                    p_installments: 1,
                    p_command_id: commandId,
                    p_client_id: command.client_id ? Number(command.client_id) : null,
                    p_description: `Liquidação Comanda #${commandId.split('-')[0].toUpperCase()}`
                });

                if (error) throw error;
            }

            if (isMounted.current) {
                setIsSuccessfullyClosed(true);
                setToast({ message: "Comanda liquidada e fechada com sucesso!", type: 'success' });
            }
        } catch (e: any) {
            if (isMounted.current) {
                setToast({ message: `Erro no Checkout: ${e.message}`, type: 'error' });
                setIsFinishing(false);
            }
        }
    };

    if (loading) return <div className="h-full flex flex-col items-center justify-center text-slate-400"><Loader2 className="animate-spin text-orange-500 mb-4" size={40} /><p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Comanda...</p></div>;

    return (
        <div className="h-full flex flex-col bg-slate-50 font-sans text-left overflow-hidden">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-20 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"><ChevronLeft size={24} /></button>
                    <div>
                        <h1 className="text-xl font-black text-slate-800">Checkout <span className="text-orange-500">#{commandId.split('-')[0].toUpperCase()}</span></h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Terminal de Recebimento</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {isSuccessfullyClosed && (
                            <div className="bg-emerald-600 rounded-[40px] p-12 text-white shadow-2xl animate-in zoom-in-95 flex flex-col items-center text-center border-4 border-emerald-500 shadow-emerald-100">
                                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-md border-2 border-white/30">
                                    <CheckCircle2 size={48} />
                                </div>
                                <h2 className="text-3xl font-black uppercase tracking-widest">Pago com Sucesso</h2>
                                <p className="text-emerald-100 mt-2 font-medium">Os valores foram creditados no fluxo de caixa da unidade.</p>
                                <button onClick={onBack} className="mt-8 px-10 py-4 bg-white text-emerald-700 font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center gap-2">Próxima Comanda <ArrowRight size={20} /></button>
                            </div>
                        )}
                        
                        {!isSuccessfullyClosed && (
                            <Card title="Itens da Comanda" icon={<ShoppingCart size={20}/>} className="rounded-[40px] border-slate-200">
                                <div className="divide-y divide-slate-50 mt-4">
                                    {items.length === 0 ? (
                                        <div className="py-20 text-center text-slate-300 italic text-sm">Nenhum item na comanda</div>
                                    ) : (
                                        items.map((item: any) => (
                                            <div key={item.id} className="py-5 flex justify-between items-center group">
                                                <div>
                                                    <p className="font-black text-slate-700 group-hover:text-orange-600 transition-colors">{item.title}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{item.quantity}x • Unid: R$ {Number(item.price).toFixed(2)}</p>
                                                </div>
                                                <p className="font-black text-slate-800 text-lg">R$ {(Number(item.price) * Number(item.quantity)).toFixed(2)}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-900 rounded-[48px] p-10 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl transition-all group-hover:bg-emerald-500/20"></div>
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Total a Liquidar</p>
                            <h2 className="text-5xl font-black tracking-tighter text-emerald-400">R$ {Number(command?.total_amount || 0).toFixed(2)}</h2>
                            <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                                    <User size={18} className="text-slate-400" />
                                </div>
                                <span className="text-xs font-bold text-slate-300 truncate">{command?.clients?.nome || 'Consumidor Final'}</span>
                            </div>
                        </div>

                        {!isSuccessfullyClosed && (
                            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm space-y-6 relative overflow-hidden">
                                {activeCategory ? (
                                    <div className="space-y-5 animate-in slide-in-from-top-2">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-[10px] font-black uppercase text-orange-600 tracking-[0.2em]">Pagar com {activeCategory.toUpperCase()}</h4>
                                            <button onClick={() => setActiveCategory(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><X size={18} className="text-slate-400"/></button>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl">R$</span>
                                            <input 
                                                autoFocus
                                                type="number" 
                                                value={amountToPay} 
                                                onChange={e => setAmountToPay(e.target.value)} 
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-6 pl-16 pr-6 text-3xl font-black text-slate-800 outline-none focus:border-orange-400 focus:bg-white transition-all shadow-inner" 
                                            />
                                        </div>
                                        <button onClick={() => { setAddedPayments([{method: activeCategory, amount: amountToPay}]); setActiveCategory(null); }} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95">Confirmar Parcela</button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['pix', 'money', 'credit', 'debit'] as const).map(cat => (
                                            <button key={cat} onClick={() => { setActiveCategory(cat); setAmountToPay(command.total_amount.toString()); }} className="p-6 rounded-3xl border-2 border-slate-50 bg-slate-50/50 hover:border-orange-200 hover:bg-white hover:shadow-lg transition-all flex flex-col items-center gap-3 active:scale-95">
                                                <div className="p-3 bg-white rounded-2xl shadow-sm">
                                                    {cat === 'pix' ? <Smartphone size={24} className="text-teal-500" /> : <Coins size={24} className="text-orange-500" />}
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{cat === 'money' ? 'Dinheiro' : cat}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="space-y-4 pt-2">
                                    <div className="h-px bg-slate-50 w-full"></div>
                                    <button 
                                        onClick={handleFinishPayment} 
                                        disabled={isFinishing || addedPayments.length === 0} 
                                        className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[32px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-100 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        {isFinishing ? <Loader2 className="animate-spin" size={24} /> : <Receipt size={24} />}
                                        {isFinishing ? 'Liquidando...' : 'Finalizar e Fechar'}
                                    </button>
                                    <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-tight">Baixa automática no fluxo de caixa da unidade</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommandDetailView;
