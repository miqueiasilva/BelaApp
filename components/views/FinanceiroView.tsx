
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
    ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, RefreshCw, 
    Plus, Loader2, Calendar, Search, Filter, AlertCircle, TrendingDown
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '../../services/supabaseClient';
import Card from '../shared/Card';
import NewTransactionModal from '../modals/NewTransactionModal';
import Toast, { ToastType } from '../shared/Toast';
import { FinancialTransaction, TransactionType } from '../../types';

const FinanceiroView: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [showModal, setShowModal] = useState<TransactionType | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchTransactions = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('financial_transactions')
                .select('*')
                .order('date', { ascending: false })
                .abortSignal(controller.signal);
            
            if (error) throw error;
            // Normalizando campos do banco para o tipo da interface se necessário
            const mapped: FinancialTransaction[] = (data || []).map((t: any) => ({
                id: t.id,
                description: t.description,
                amount: t.amount,
                type: t.type,
                category: t.category,
                date: new Date(t.date),
                paymentMethod: t.payment_method,
                status: t.status
            }));
            setTransactions(mapped);
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                setToast({ message: 'Erro ao carregar finanças: ' + error.message, type: 'error' });
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTransactions();
        return () => abortControllerRef.current?.abort();
    }, [fetchTransactions]);

    const metrics = useMemo(() => {
        const today = new Date();
        const incomeMonth = transactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0);
        const expenseMonth = transactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0);
        
        const incomeToday = transactions.filter(t => t.type === 'receita' && isSameDay(t.date, today)).reduce((acc, t) => acc + t.amount, 0);
        
        return { incomeMonth, expenseMonth, balance: incomeMonth - expenseMonth, incomeToday };
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => 
            t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [transactions, searchTerm]);

    const handleSaveTransaction = async (t: FinancialTransaction) => {
        try {
            const { error } = await supabase.from('financial_transactions').insert([{
                description: t.description,
                amount: t.amount,
                type: t.type,
                category: t.category,
                date: t.date.toISOString(),
                payment_method: t.paymentMethod,
                status: 'pago'
            }]);

            if (error) throw error;

            setToast({ message: 'Lançamento registrado com sucesso!', type: 'success' });
            setShowModal(null);
            fetchTransactions();
        } catch (error: any) {
            alert("Erro ao salvar: " + error.message);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <header className="bg-white border-b border-slate-200 px-6 py-5 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Wallet className="text-orange-500" /> Fluxo de Caixa
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Gestão financeira centralizada e tempo real.</p>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={fetchTransactions} className="p-2.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all bg-white border border-slate-100"><RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} /></button>
                    <button onClick={() => setShowModal('receita')} className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95">
                        <Plus className="w-4 h-4"/> Receita
                    </button>
                    <button onClick={() => setShowModal('despesa')} className="flex-1 md:flex-none bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-100 transition-all active:scale-95">
                        <Plus className="w-4 h-4"/> Despesa
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                {/* Dashboard Financeiro */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Saldo do Mês</p>
                        <h3 className={`text-3xl font-black mt-2 tracking-tighter ${metrics.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                            R$ {metrics.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                        <div className="flex items-center gap-1 mt-3 text-[10px] font-bold text-slate-400 uppercase">
                             <TrendingUp size={12}/> Consolidado
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                        <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Entradas (Mês)</p>
                        <h3 className="text-3xl font-black text-emerald-600 mt-2 tracking-tighter">
                            + R$ {metrics.incomeMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                         <div className="flex items-center gap-1 mt-3 text-[10px] font-bold text-emerald-400 uppercase">
                             <ArrowUpCircle size={12}/> Receitas
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                        <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest">Saídas (Mês)</p>
                        <h3 className="text-3xl font-black text-rose-600 mt-2 tracking-tighter">
                            - R$ {metrics.expenseMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                        <div className="flex items-center gap-1 mt-3 text-[10px] font-bold text-rose-400 uppercase">
                             <ArrowDownCircle size={12}/> Despesas
                        </div>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-[32px] shadow-xl text-white">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Faturamento Hoje</p>
                        <h3 className="text-3xl font-black text-orange-500 mt-2 tracking-tighter">
                            R$ {metrics.incomeToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                        <div className="flex items-center gap-1 mt-3 text-[10px] font-bold text-slate-500 uppercase">
                             <Calendar size={12}/> {format(new Date(), 'dd MMM', { locale: pt })}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar no extrato por descrição ou categoria..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    {isLoading && transactions.length === 0 ? (
                        <div className="p-20 text-center text-slate-400 animate-pulse">
                            <Loader2 className="animate-spin mx-auto mb-4" size={40} />
                            <p className="font-bold uppercase tracking-widest text-xs">Sincronizando extrato...</p>
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="p-20 text-center text-slate-300 italic">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search size={24} className="opacity-20" />
                            </div>
                            <p>Nenhuma transação encontrada no período.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-5">Data</th>
                                        <th className="px-6 py-5">Descrição do Lançamento</th>
                                        <th className="px-6 py-5">Categoria</th>
                                        <th className="px-6 py-5">Pagamento</th>
                                        <th className="px-6 py-5 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTransactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-xs text-slate-500 font-bold whitespace-nowrap">
                                                {format(t.date, 'dd/MM/yyyy')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-800 leading-tight group-hover:text-orange-600 transition-colors">{t.description}</p>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">ID #{t.id}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-tighter">{t.category}</span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tighter">
                                                {t.paymentMethod?.replace('_', ' ')}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-black text-base tracking-tighter ${t.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {t.type === 'receita' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {showModal && (
                <NewTransactionModal 
                    type={showModal} 
                    onClose={() => setShowModal(null)} 
                    onSave={handleSaveTransaction}
                />
            )}
        </div>
    );
};

export default FinanceiroView;
