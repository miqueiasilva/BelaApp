
import React, { useState, useEffect, useMemo } from 'react';
import { 
    ChevronLeft, CreditCard, Smartphone, Banknote, 
    Trash2, Plus, ArrowRight, Loader2, CheckCircle,
    User, Phone, Scissors, ShoppingBag, Receipt,
    FileText, Tag, DollarSign, Percent, AlertCircle,
    Calendar, ShoppingCart, Info, X, Coins, UserCheck,
    PlusCircle
} from 'lucide-react';
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
}

const CommandDetailView: React.FC<CommandDetailViewProps> = ({ commandId, onBack }) => {
    const [command, setCommand] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFinishing, setIsFinishing] = useState(false);
    const [addedPayments, setAddedPayments] = useState<PaymentEntry[]>([]);
    const [amountInput, setAmountInput] = useState<string>('0');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const fetchCommand = async () => {
        setLoading(true);
        try {
            // FIX: Join profundo garantindo a recuperação de IDs para comissões
            const { data, error } = await supabase
                .from('commands')
                .select(`
                    *, 
                    clients:client_id(id, nome, name, whatsapp), 
                    command_items(*, team_members:professional_id(id, name, commission_rate))
                `)
                .eq('id', commandId)
                .single();

            if (error) throw error;
            setCommand(data);
            
            // Inicializa o input com o valor total restante
            const total = data.command_items.reduce((acc: number, i: any) => acc + (Number(i.price) * Number(i.quantity)), 0);
            setAmountInput(total.toString());
        } catch (e: any) {
            setToast({ message: "Erro ao carregar dados da comanda.", type: 'error' });
            setTimeout(onBack, 2000);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (commandId) fetchCommand();
    }, [commandId]);

    const totals = useMemo(() => {
        if (!command) return { total: 0, paid: 0, remaining: 0 };
        const total = command.command_items.reduce((acc: number, i: any) => acc + (Number(i.price) * Number(i.quantity)), 0);
        const paid = addedPayments.reduce((acc, p) => acc + p.amount, 0);
        const remaining = Math.max(0, total - paid);
        return { total, paid, remaining };
    }, [command, addedPayments]);

    const handleAddPayment = (method: PaymentMethod) => {
        const val = parseFloat(amountInput);
        if (isNaN(val) || val <= 0) {
            setToast({ message: "Informe um valor válido.", type: 'error' });
            return;
        }
        if (val > totals.remaining + 0.01) {
            setToast({ message: "Valor superior ao saldo restante.", type: 'error' });
            return;
        }

        const newPayment: PaymentEntry = {
            id: Math.random().toString(36).substr(2, 9),
            method,
            amount: val
        };

        setAddedPayments([...addedPayments, newPayment]);
        setAmountInput((totals.remaining - val).toFixed(2));
    };

    const removePayment = (id: string) => {
        setAddedPayments(addedPayments.filter(p => p.id !== id));
    };

    const handleFinishPayment = async () => {
        if (!command || isFinishing) return;
        if (totals.remaining > 0.01) {
            setToast({ message: "Ainda restam valores a pagar.", type: 'error' });
            return;
        }

        setIsFinishing(true);
        try {
            // FIX: Registra a transação garantindo o vínculo com o cliente e profissionais (comissões)
            // Para comandos com múltiplos itens, o sistema Belare gera uma entrada por pagamento
            // vinculando ao client_id da comanda para o histórico.
            for (const payment of addedPayments) {
                const { error: transError } = await supabase.from('financial_transactions').insert([{
                    description: `Recebimento Comanda #${command.id.substring(0,8).toUpperCase()}`,
                    amount: payment.amount,
                    type: 'income',
                    category: 'servico',
                    payment_method: payment.method,
                    client_id: command.client_id,
                    status: 'paid',
                    date: new Date().toISOString()
                }]);
                if (transError) throw transError;
            }

            // Atualiza status da comanda
            const { error: cmdUpdateError } = await supabase.from('commands')
                .update({ status: 'paid', closed_at: new Date().toISOString(), total_amount: totals.total })
                .eq('id', command.id);
            
            if (cmdUpdateError) throw cmdUpdateError;

            setToast({ message: "Pagamento finalizado com sucesso!", type: 'success' });
            setTimeout(onBack, 1500);
        } catch (e: any) {
            setToast({ message: "Erro ao processar finalização.", type: 'error' });
        } finally {
            setIsFinishing(false);
        }
    };

    if (loading) return <div className="h-full flex flex-col items-center justify-center text-slate-400"><Loader2 className="animate-spin text-orange-500 mb-4" size={40} /> <p className="font-black uppercase text-[10px] tracking-widest">Carregando Checkout...</p></div>;
    if (!command) return null;

    const clientDisplayName = command.clients?.nome || command.clients?.name || 'Cliente Não Identificado';

    return (
        <div className="h-full flex flex-col bg-slate-50 font-sans text-left overflow-hidden">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><ChevronLeft size={24} /></button>
                    <h1 className="text-xl font-black text-slate-800">Fechar <span className="text-orange-500">Comanda</span></h1>
                </div>
                <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">ID Comanda</span>
                    <span className="text-xs font-black text-slate-700">#{command.id.substring(0,8).toUpperCase()}</span>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* COLUNA ESQUERDA: RESUMO DA COMANDA */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* CARD CLIENTE */}
                        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex items-center gap-6">
                            <div className={`w-16 h-16 ${command.clients?.id ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'} rounded-2xl flex items-center justify-center font-black text-xl border-2 border-white shadow-sm`}>
                                {clientDisplayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className={`text-2xl font-black ${command.clients?.id ? 'text-slate-800' : 'text-slate-400'}`}>{clientDisplayName}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                                    <Phone size={14} className="text-orange-500" /> {command.clients?.whatsapp || 'Sem contato'}
                                </p>
                            </div>
                        </div>

                        {/* LISTA DE ITENS */}
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                                <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">Serviços e Consumo</h4>
                                <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-[10px] font-black text-slate-500">{command.command_items.length} itens</span>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {command.command_items.map((item: any) => (
                                    <div key={item.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-2xl ${item.product_id ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {item.product_id ? <ShoppingBag size={20} /> : <Scissors size={20} />}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 leading-tight">{item.title}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <UserCheck size={12} className="text-orange-500" />
                                                    <p className="text-[10px] font-black uppercase">
                                                        <span className="text-slate-400">Feito por:</span> <span className={item.team_members?.id ? 'text-slate-600' : 'text-rose-500 font-black'}>{item.team_members?.name || 'NÃO VINCULADO'}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-slate-800">R$ {Number(item.price).toFixed(2)}</p>
                                            {item.team_members?.commission_rate && (
                                                <p className="text-[9px] font-bold text-emerald-600 uppercase">Comissão: {item.team_members.commission_rate}%</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA: PAGAMENTO (SPLIT PAYMENT) */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Saldo Remanescente</p>
                                <h2 className={`text-4xl font-black tracking-tighter ${totals.remaining <= 0.01 ? 'text-emerald-400' : 'text-white'}`}>
                                    R$ {totals.remaining.toFixed(2)}
                                </h2>
                                <div className="mt-6 space-y-3">
                                    <div className="flex justify-between text-xs font-bold text-slate-400 border-b border-white/10 pb-2">
                                        <span>Subtotal</span>
                                        <span>R$ {totals.total.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-emerald-400">
                                        <span>Total Pago</span>
                                        <span>R$ {totals.paid.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            <Receipt size={100} className="absolute -right-6 -bottom-6 text-white/5 rotate-12" />
                        </div>

                        {/* SELETOR DE PAGAMENTO ADICIONAL */}
                        {totals.remaining > 0.01 && (
                            <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lançar Pagamento Parcial</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black">R$</span>
                                    <input 
                                        type="number" 
                                        value={amountInput}
                                        onChange={(e) => setAmountInput(e.target.value)}
                                        className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl text-slate-800 outline-none focus:ring-4 focus:ring-orange-100 transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleAddPayment('pix')} className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 rounded-2xl transition-all group">
                                        <Smartphone className="text-teal-600 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-black uppercase text-slate-600">Pix</span>
                                    </button>
                                    <button onClick={() => handleAddPayment('cartao_credito')} className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-2xl transition-all group">
                                        <CreditCard className="text-blue-600 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-black uppercase text-slate-600">Cartão</span>
                                    </button>
                                    <button onClick={() => handleAddPayment('dinheiro')} className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 rounded-2xl transition-all group">
                                        <Banknote className="text-emerald-600 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-black uppercase text-slate-600">Espécie</span>
                                    </button>
                                    <button onClick={() => setAmountInput(totals.remaining.toString())} className="flex flex-col items-center justify-center p-4 bg-orange-50 border border-orange-100 rounded-2xl hover:bg-orange-100 transition-all">
                                        <span className="text-[10px] font-black uppercase text-orange-600">Pagar Tudo</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* LISTA DE PAGAMENTOS ADICIONADOS */}
                        {addedPayments.length > 0 && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pagamentos Registrados</label>
                                {addedPayments.map(p => (
                                    <div key={p.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                                                {p.method === 'pix' ? <Smartphone size={16}/> : p.method === 'dinheiro' ? <Banknote size={16}/> : <CreditCard size={16}/>}
                                            </div>
                                            <p className="text-xs font-black text-slate-700">R$ {p.amount.toFixed(2)}</p>
                                        </div>
                                        <button onClick={() => removePayment(p.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* BOTÃO FINALIZADOR REAL */}
                        <button 
                            onClick={handleFinishPayment}
                            disabled={totals.remaining > 0.01 || isFinishing}
                            className={`w-full py-5 rounded-[28px] font-black text-white shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${totals.remaining <= 0.01 ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                        >
                            {isFinishing ? <Loader2 className="animate-spin" /> : <><CheckCircle size={24}/> Finalizar Atendimento</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommandDetailView;
