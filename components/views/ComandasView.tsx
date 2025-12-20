
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
    FileText, User as UserIcon, DollarSign, Clock, RefreshCw, Loader2, CheckCircle, Search, X, CreditCard
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { Order, PaymentMethod } from '../../types';
import Toast, { ToastType } from '../shared/Toast';
import { format } from 'date-fns';

const ComandasView: React.FC = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [closingOrder, setClosingOrder] = useState<any | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
    const [isSaving, setIsSaving] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchOrders = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        try {
            // Busca ordens abertas vinculando com o nome do cliente
            const { data, error } = await supabase
                .from('orders')
                .select('*, clients(nome, id)')
                .eq('status', 'aberta')
                .order('created_at', { ascending: false })
                .abortSignal(controller.signal);
            
            if (error) throw error;
            setOrders(data || []);
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                setToast({ message: 'Erro ao buscar comandas: ' + error.message, type: 'error' });
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        return () => abortControllerRef.current?.abort();
    }, [fetchOrders]);

    const handleCloseOrder = async () => {
        if (!closingOrder) return;
        setIsSaving(true);
        try {
            // 1. Atualizar Status do Pedido
            const { error: oErr } = await supabase.from('orders').update({ status: 'fechada' }).eq('id', closingOrder.id);
            if (oErr) throw oErr;

            // 2. Gerar Lançamento Financeiro
            const { error: tErr } = await supabase.from('financial_transactions').insert([{
                description: `Recebimento Comanda #${closingOrder.id} - ${closingOrder.clients?.nome || 'Balcão'}`,
                amount: closingOrder.total,
                type: 'receita',
                category: 'servico',
                payment_method: paymentMethod,
                date: new Date().toISOString(),
                status: 'pago',
                client_id: closingOrder.client_id
            }]);
            if (tErr) throw tErr;

            setToast({ message: 'Pagamento recebido e comanda encerrada!', type: 'success' });
            setClosingOrder(null);
            fetchOrders();
        } catch (e: any) {
            setToast({ message: 'Erro ao processar: ' + e.message, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(o => 
            (o.clients?.nome || 'Balcão').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [orders, searchTerm]);

    return (
        <div className="h-full flex flex-col bg-slate-50 relative font-sans">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <header className="bg-white border-b border-slate-200 px-6 py-5 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-orange-500" /> Comandas em Aberto
                    </h1>
                    <p className="text-slate-500 text-sm">Controle de serviços realizados aguardando pagamento.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border-none rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all font-medium" />
                    </div>
                    <button onClick={fetchOrders} className="p-2.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"><RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} /></button>
                </div>
            </header>

            <main className="flex-1 p-6 overflow-y-auto scrollbar-hide">
                {isLoading && orders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-pulse">
                        <Loader2 className="animate-spin mb-4" size={40} />
                        <p className="font-bold uppercase tracking-widest text-xs">Sincronizando contas...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 italic">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <FileText size={32} className="opacity-20" />
                        </div>
                        <p className="font-medium">Nenhuma comanda aberta no momento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredOrders.map(order => (
                            <div key={order.id} className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-6 flex flex-col hover:shadow-2xl transition-all group relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500 opacity-20"></div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                                            {/* FIX: Corrected import to use User as UserIcon from lucide-react */}
                                            <UserIcon size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm truncate max-w-[150px] leading-tight">{order.clients?.nome || 'Cliente Balcão'}</h3>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Nº {order.id}</p>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-inner">Open</div>
                                </div>

                                <div className="flex-1 space-y-3 mb-8">
                                    <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-widest">
                                        <div className="flex items-center gap-2"><Clock size={12} className="text-slate-300"/> {format(new Date(order.created_at), 'HH:mm')}</div>
                                        <span>Total</span>
                                    </div>
                                    <div className="text-4xl font-black text-slate-900 text-right tracking-tighter">R$ {order.total.toFixed(2)}</div>
                                </div>

                                <button onClick={() => setClosingOrder(order)} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-100 transition-all active:scale-95">
                                    <DollarSign size={18} /> RECEBER CONTA
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal de Fechamento */}
            {closingOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Recebimento</h2>
                            <button onClick={() => setClosingOrder(null)} className="p-2 text-slate-400 hover:bg-white rounded-full transition-colors"><X size={20}/></button>
                        </header>
                        <div className="p-8 space-y-6">
                            <div className="text-center space-y-2">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Valor a Receber</p>
                                <h3 className="text-5xl font-black text-orange-600 tracking-tighter">R$ {closingOrder.total.toFixed(2)}</h3>
                                <p className="text-sm font-bold text-slate-600 pt-2 border-t border-slate-50">{closingOrder.clients?.nome || 'Balcão'}</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Meio de Pagamento</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['pix', 'cartao_credito', 'cartao_debito', 'dinheiro'].map(m => (
                                        <button key={m} onClick={() => setPaymentMethod(m as any)} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${paymentMethod === m ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                                            {m.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={handleCloseOrder} disabled={isSaving} className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-5 rounded-[28px] shadow-xl shadow-green-100 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 mt-4">
                                {isSaving ? <Loader2 className="animate-spin" /> : <><CheckCircle size={20} /> CONFIRMAR RECEBIMENTO</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComandasView;
