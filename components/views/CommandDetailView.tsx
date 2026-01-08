
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
}

const CommandDetailView: React.FC<CommandDetailViewProps> = ({ commandId, onBack }) => {
    const [command, setCommand] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFinishing, setIsFinishing] = useState(false);
    const [addedPayments, setAddedPayments] = useState<PaymentEntry[]>([]);
    const [activeMethod, setActiveMethod] = useState<PaymentMethod | null>(null);
    const [amountToPay, setAmountToPay] = useState<string>('0');
    const [discount, setDiscount] = useState<string>('0');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const fetchCommand = async () => {
        setLoading(true);
        try {
            // SOLUÇÃO: Select profundo com relacionamentos explícitos
            const { data, error } = await supabase
                .from('commands')
                .select(`
                    *, 
                    clients(id, nome, name, whatsapp), 
                    command_items(*, team_members(id, name))
                `)
                .eq('id', commandId)
                .single();

            if (error) throw error;
            setCommand(data);
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
        if (!command) return { subtotal: 0, total: 0, paid: 0, remaining: 0 };
        const subtotal = command.command_items.reduce((acc: number, i: any) => acc + (Number(i.price) * Number(i.quantity)), 0);
        const discValue = parseFloat(discount) || 0;
        const totalAfterDiscount = Math.max(0, subtotal - discValue);
        const paid = addedPayments.reduce((acc, p) => acc + p.amount, 0);
        const remaining = Math.max(0, totalAfterDiscount - paid);
        return { subtotal, total: totalAfterDiscount, paid, remaining };
    }, [command, discount, addedPayments]);

    const handleFinishPayment = async () => {
        if (!command || isFinishing || addedPayments.length === 0) return;
        setIsFinishing(true);

        const clientName = command.clients?.nome || command.clients?.name || 'Cliente Não Identificado';

        try {
            for (const payment of addedPayments) {
                await supabase.from('financial_transactions').insert([{
                    description: `Recebimento Comanda - ${clientName}`,
                    amount: payment.amount,
                    type: 'income',
                    category: 'servico',
                    payment_method: payment.method,
                    client_id: command.client_id,
                    date: new Date().toISOString(),
                    status: 'paid'
                }]);
            }

            await supabase.from('commands').update({ 
                status: 'paid',
                closed_at: new Date().toISOString(),
                total_amount: totals.total
            }).eq('id', command.id);

            setToast({ message: "Checkout finalizado com sucesso!", type: 'success' });
            setTimeout(onBack, 1500);
        } catch (e: any) {
            setToast({ message: "Erro ao processar pagamento.", type: 'error' });
        } finally {
            setIsFinishing(false);
        }
    };

    if (loading) return <div className="h-full flex items-center justify-center text-slate-400"><Loader2 className="animate-spin text-orange-500 mr-2" /> Carregando Checkout...</div>;
    if (!command) return null;

    const clientDisplayName = command.clients?.nome || command.clients?.name || 'Cliente Não Identificado';

    return (
        <div className="h-full flex flex-col bg-slate-50 font-sans text-left">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><ChevronLeft size={24} /></button>
                    <div>
                        <h1 className="text-xl font-black text-slate-800">Checkout <span className="text-orange-500">#{command.id.substring(0,8).toUpperCase()}</span></h1>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* CARD CLIENTE - CORREÇÃO DE NOME */}
                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm flex items-center gap-6">
                        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center font-black text-xl">
                            {clientDisplayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">{clientDisplayName}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                                <Phone size={14} /> {command.clients?.whatsapp || 'Sem telefone registrado'}
                            </p>
                        </div>
                    </div>

                    {/* LISTA DE ITENS - CORREÇÃO DE PROFISSIONAL */}
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="divide-y divide-slate-50">
                            {command.command_items.map((item: any) => (
                                <div key={item.id} className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${item.product_id ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {item.product_id ? <ShoppingBag size={20} /> : <Scissors size={20} />}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 leading-tight">{item.title}</p>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <UserCheck size={12} className="text-orange-500" />
                                                <p className="text-[10px] text-slate-400 font-black uppercase">
                                                    Feito por: <span className="text-slate-600">{item.team_members?.name || 'NÃO VINCULADO'}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="font-black text-slate-800">R$ {Number(item.price).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* FOOTER DE PAGAMENTO */}
                    <div className="bg-slate-900 rounded-[32px] p-8 text-white flex justify-between items-center shadow-xl">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total a Receber</p>
                            <h2 className="text-4xl font-black text-emerald-400 tracking-tighter">R$ {totals.total.toFixed(2)}</h2>
                        </div>
                        <button 
                            onClick={() => setActiveMethod('pix')}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-10 py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-orange-900/20"
                        >
                            Confirmar Pagamento
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommandDetailView;
