
import React, { useState, useEffect, useMemo } from 'react';
import { 
    ChevronLeft, CreditCard, Smartphone, Banknote, 
    Trash2, Plus, ArrowRight, Loader2, CheckCircle,
    User, Phone, Scissors, ShoppingBag, Receipt,
    FileText, Tag, DollarSign, Percent, AlertCircle,
    Calendar, ShoppingCart, Info, X, Coins, UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR as pt } from 'date-fns/locale/pt-BR';
import { supabase } from '../../services/supabaseClient';
import { Command, CommandItem, PaymentMethod } from '../../types';
import Toast, { ToastType } from '../shared/Toast';

interface CommandDetailViewProps {
    commandId: string;
    onBack: () => void;
}

interface PaymentEntry {
    id: string;
    method: PaymentMethod;
    amount: number;
    net_value: number;
    tax_rate: number;
}

const CommandDetailView: React.FC<CommandDetailViewProps> = ({ commandId, onBack }) => {
    const [command, setCommand] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFinishing, setIsFinishing] = useState(false);
    
    // Configurações de Taxas Reais
    const [paymentConfigs, setPaymentConfigs] = useState<any[]>([]);
    
    // Pagamentos Mistos
    const [addedPayments, setAddedPayments] = useState<PaymentEntry[]>([]);
    const [activeMethod, setActiveMethod] = useState<PaymentMethod | null>(null);
    const [amountToPay, setAmountToPay] = useState<string>('0');
    
    const [discount, setDiscount] = useState<string>('0');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cmdRes, configRes] = await Promise.all([
                supabase
                    .from('commands')
                    .select('*, clients(*), command_items(*, team_members(id, name))')
                    .eq('id', commandId)
                    .single(),
                supabase
                    .from('payment_methods_config')
                    .select('*')
                    .eq('is_active', true)
            ]);

            if (cmdRes.error) throw cmdRes.error;
            setCommand(cmdRes.data);
            setPaymentConfigs(configRes.data || []);
        } catch (e: any) {
            setToast({ message: "Erro ao sincronizar dados do checkout.", type: 'error' });
            setTimeout(onBack, 2000);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (commandId) fetchData(); }, [commandId]);

    const totals = useMemo(() => {
        if (!command) return { subtotal: 0, total: 0, paid: 0, remaining: 0 };
        const subtotal = command.command_items.reduce((acc: number, i: any) => acc + (Number(i.price) * Number(i.quantity)), 0);
        const discValue = parseFloat(discount) || 0;
        const totalAfterDiscount = Math.max(0, subtotal - discValue);
        const paid = addedPayments.reduce((acc, p) => acc + p.amount, 0);
        const remaining = Math.max(0, totalAfterDiscount - paid);
        return { subtotal, total: totalAfterDiscount, paid, remaining };
    }, [command, discount, addedPayments]);

    // Lógica de Comissão Líquida no Checkout
    const calculateNetValue = (amount: number, method: PaymentMethod) => {
        // Mapeia o enum de UI para o tipo do banco
        const dbType = method === 'cartao_credito' ? 'credit' : 
                       method === 'cartao_debito' ? 'debit' : 
                       method === 'pix' ? 'pix' : 'money';
        
        const config = paymentConfigs.find(c => c.type === dbType);
        const taxRate = config ? Number(config.rate_cash) : 0;
        const net = amount * (1 - (taxRate / 100));
        return { net, taxRate };
    };

    const handleInitPayment = (method: PaymentMethod) => {
        setActiveMethod(method);
        setAmountToPay(totals.remaining.toFixed(2));
    };

    const handleConfirmPartialPayment = () => {
        if (!activeMethod || parseFloat(amountToPay) <= 0) return;

        const val = parseFloat(amountToPay);
        const { net, taxRate } = calculateNetValue(val, activeMethod);

        const newPayment: PaymentEntry = {
            id: Math.random().toString(36).substring(2, 9),
            method: activeMethod,
            amount: val,
            net_value: net,
            tax_rate: taxRate
        };

        setAddedPayments(prev => [...prev, newPayment]);
        setActiveMethod(null);
        setAmountToPay('0');
    };

    const handleFinishPayment = async () => {
        if (!command || isFinishing || addedPayments.length === 0) return;
        setIsFinishing(true);

        try {
            // Gerar Transações Financeiras (Mapeando o Valor Líquido para Comissão)
            const transactionPromises = addedPayments.map(p => {
                return supabase.from('financial_transactions').insert([{
                    description: `Checkout Comanda #${command.id.split('-')[0].toUpperCase()} - ${command.clients?.nome || 'Cliente'}`,
                    amount: p.amount,
                    net_value: p.net_value, // O módulo de remuneração lerá este campo
                    tax_rate: p.tax_rate,
                    type: 'income',
                    category: 'servico',
                    payment_method: p.method,
                    client_id: command.client_id,
                    professional_id: command.professional_id, // Atribui comissão ao profissional da comanda
                    date: new Date().toISOString(),
                    status: 'paid'
                }]);
            });

            await Promise.all(transactionPromises);

            // Atualizar status da comanda
            await supabase
                .from('commands')
                .update({ 
                    status: 'paid', 
                    closed_at: new Date().toISOString(),
                    total_amount: totals.total 
                })
                .eq('id', command.id);

            setToast({ message: "Pagamento processado com sucesso!", type: 'success' });
            setTimeout(onBack, 1500);
        } catch (e: any) {
            setToast({ message: "Erro ao liquidar pagamento.", type: 'error' });
        } finally {
            setIsFinishing(false);
        }
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center bg-slate-50">
            <Loader2 className="animate-spin text-orange-500" size={32} />
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-slate-50 font-sans text-left overflow-hidden">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-20 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-800">Checkout Inteligente</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sincronizado com cliente {command.clients?.nome || 'Não Identificado'}</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
                    
                    <div className="lg:col-span-2 space-y-6">
                        {/* Lista de Itens */}
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                            <header className="px-8 py-5 border-b border-slate-50 bg-slate-50/50">
                                <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                                    <ShoppingCart size={16} className="text-orange-500" /> Detalhes do Consumo
                                </h3>
                            </header>
                            <div className="divide-y divide-slate-50">
                                {command.command_items.map((item: any) => (
                                    <div key={item.id} className="p-6 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-slate-50 rounded-2xl text-slate-400"><Scissors size={20}/></div>
                                            <div>
                                                <p className="font-bold text-slate-700">{item.title}</p>
                                                <p className="text-[10px] text-slate-400 font-black uppercase">Executado por: {item.team_members?.name || '---'}</p>
                                            </div>
                                        </div>
                                        <p className="font-black text-slate-800">R$ {Number(item.price).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pagamentos Adicionados (Split) */}
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                            <header className="px-8 py-5 border-b border-slate-50 bg-emerald-50/50">
                                <h3 className="font-black text-emerald-800 text-xs uppercase tracking-widest flex items-center gap-2">
                                    <DollarSign size={16} /> Pagamentos Recebidos
                                </h3>
                            </header>
                            <div className="p-6 space-y-3">
                                {addedPayments.length === 0 ? (
                                    <div className="py-10 text-center text-slate-300 italic text-sm">Nenhum pagamento registrado.</div>
                                ) : (
                                    addedPayments.map(p => (
                                        <div key={p.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-sm"><CheckCircle size={16}/></div>
                                                <div>
                                                    <p className="text-xs font-black uppercase text-slate-500">{p.method.replace('_', ' ')}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">Líquido: R$ {p.net_value.toFixed(2)} (taxa {p.tax_rate}%)</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-black text-slate-700">R$ {p.amount.toFixed(2)}</span>
                                                <button onClick={() => setAddedPayments(prev => prev.filter(x => x.id !== p.id))} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Resumo Financeiro */}
                        <div className="bg-slate-900 rounded-[48px] p-10 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 transition-transform duration-700"><Receipt size={200} /></div>
                            <div className="relative z-10 space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-400"><span>Subtotal</span><span>R$ {totals.subtotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-400"><Percent size={14} /> Desconto</div>
                                        <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-20 bg-white/10 border border-white/10 rounded-xl px-2 py-1 text-right font-black text-white outline-none focus:ring-2 focus:ring-orange-500" />
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-white/10">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Final</p>
                                    <h2 className="text-5xl font-black tracking-tighter text-emerald-400">R$ {totals.total.toFixed(2)}</h2>
                                </div>
                                {totals.remaining > 0 && (
                                    <div className="pt-4 flex justify-between items-center text-xs font-black uppercase text-orange-400">
                                        <span>Restante:</span>
                                        <span className="text-lg">R$ {totals.remaining.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Seletor de Pagamento */}
                        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm space-y-6">
                            {activeMethod ? (
                                <div className="animate-in zoom-in-95 duration-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[10px] font-black uppercase text-orange-600">Valor no {activeMethod.toUpperCase()}</span>
                                        <button onClick={() => setActiveMethod(null)} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400"><X size={18}/></button>
                                    </div>
                                    <div className="relative mb-4">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">R$</span>
                                        <input autoFocus type="number" value={amountToPay} onChange={e => setAmountToPay(e.target.value)} className="w-full bg-slate-50 border-2 border-orange-500 rounded-2xl py-4 pl-12 pr-4 text-2xl font-black text-slate-800 outline-none" />
                                    </div>
                                    <button onClick={handleConfirmPartialPayment} className="w-full bg-slate-800 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95">Adicionar Pagamento</button>
                                </div>
                            ) : (
                                <>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2"><CreditCard size={14} className="text-orange-500" /> Escolha o Método</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'pix', label: 'Pix', icon: Smartphone },
                                            { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                                            { id: 'cartao_credito', label: 'Crédito', icon: CreditCard },
                                            { id: 'cartao_debito', label: 'Débito', icon: CreditCard },
                                        ].map(pm => (
                                            <button key={pm.id} onClick={() => handleInitPayment(pm.id as PaymentMethod)} className="flex flex-col items-center justify-center p-5 rounded-[24px] bg-slate-50 border border-transparent hover:border-orange-200 hover:bg-white transition-all group">
                                                <pm.icon size={24} className="mb-2 text-slate-300 group-hover:text-orange-500 transition-colors" />
                                                <span className="text-[9px] font-black uppercase tracking-tighter text-slate-500">{pm.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            <button 
                                onClick={handleFinishPayment}
                                disabled={isFinishing || totals.remaining > 0 || addedPayments.length === 0}
                                className={`w-full mt-4 py-5 rounded-[24px] font-black text-lg uppercase tracking-widest transition-all shadow-xl ${totals.remaining === 0 && addedPayments.length > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100' : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'}`}
                            >
                                {isFinishing ? <Loader2 size={24} className="animate-spin mx-auto" /> : (totals.remaining > 0 ? `Faltam R$ ${totals.remaining.toFixed(2)}` : 'Fechar Comanda')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommandDetailView;
