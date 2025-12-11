
import React, { useState, useMemo } from 'react';
import { 
    ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, AlertTriangle, CheckCircle, Plus
} from 'lucide-react';
import Card from '../shared/Card';
import SafeBar from '../charts/SafeBar';
import SafePie from '../charts/SafePie';
import NewTransactionModal from '../modals/NewTransactionModal';
import { professionals } from '../../data/mockData';
import { FinancialTransaction, TransactionType } from '../../types';
import { format, isSameDay, isSameWeek, isSameMonth } from 'date-fns';

interface FinanceiroViewProps {
    transactions: FinancialTransaction[];
    onAddTransaction: (t: FinancialTransaction) => void;
}

const FinanceiroView: React.FC<FinanceiroViewProps> = ({ transactions, onAddTransaction }) => {
    const [currentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [activeTab, setActiveTab] = useState<'visao_geral' | 'extrato' | 'comissoes'>('visao_geral');
    const [showModal, setShowModal] = useState<TransactionType | null>(null);

    // --- Logic & Calculations ---

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            if (viewMode === 'daily') return isSameDay(tDate, currentDate);
            if (viewMode === 'weekly') return isSameWeek(tDate, currentDate);
            if (viewMode === 'monthly') return isSameMonth(tDate, currentDate);
            return true;
        });
    }, [transactions, currentDate, viewMode]);

    const metrics = useMemo(() => {
        const income = filteredTransactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0);
        const expense = filteredTransactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0);
        const balance = income - expense;
        
        // Mock previous balance logic
        const previousBalance = 1500; // Starting balance for demo
        
        return { income, expense, balance, finalBalance: previousBalance + balance };
    }, [filteredTransactions]);

    const chartData = useMemo(() => {
        // Prepare data for charts
        const expenseByCategory: {[key: string]: number} = {};
        filteredTransactions
            .filter(t => t.type === 'despesa')
            .forEach(t => {
                expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
            });

        return Object.entries(expenseByCategory).map(([name, value]) => ({ name, receita: value }));
    }, [filteredTransactions]);

    // --- Handlers ---

    const handleAddTransaction = (transaction: FinancialTransaction) => {
        onAddTransaction(transaction);
        setShowModal(null);
    };

    // --- Render ---

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Wallet className="text-orange-500" />
                        Fluxo de Caixa
                    </h1>
                    <p className="text-slate-500 text-sm">Controle financeiro inteligente do seu estúdio.</p>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('daily')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'daily' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Dia
                    </button>
                    <button 
                        onClick={() => setViewMode('weekly')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'weekly' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Semana
                    </button>
                    <button 
                        onClick={() => setViewMode('monthly')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'monthly' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Mês
                    </button>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setShowModal('receita')} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4"/> Receita
                    </button>
                    <button onClick={() => setShowModal('despesa')} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4"/> Despesa
                    </button>
                </div>
            </header>

            {/* JaciBot Insight */}
            <div className="px-6 pt-4">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-start gap-3">
                    <div className="bg-indigo-100 p-2 rounded-full">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-indigo-800 uppercase">Insight Financeiro</p>
                        <p className="text-sm text-indigo-700">
                            Sua margem de lucro está <strong>15% maior</strong> que a semana passada. O serviço "Volume Egípcio" representa 40% da sua receita hoje.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-slate-400 text-xs font-bold uppercase">Saldo do Período</p>
                        <p className={`text-2xl font-bold mt-1 ${metrics.balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                            R$ {metrics.balance.toFixed(2)}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-green-100 bg-green-50/50 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-green-600/70 text-xs font-bold uppercase">Receitas</p>
                                <p className="text-2xl font-bold text-green-600 mt-1">R$ {metrics.income.toFixed(2)}</p>
                            </div>
                            <ArrowUpCircle className="text-green-400 w-5 h-5"/>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-red-100 bg-red-50/50 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-red-600/70 text-xs font-bold uppercase">Despesas</p>
                                <p className="text-2xl font-bold text-red-600 mt-1">R$ {metrics.expense.toFixed(2)}</p>
                            </div>
                            <ArrowDownCircle className="text-red-400 w-5 h-5"/>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-slate-400 text-xs font-bold uppercase">Previsão (Fim do Mês)</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">R$ {(metrics.income * 1.2).toFixed(2)}</p>
                        <span className="text-[10px] text-slate-400">Baseado na média diária</span>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="border-b border-slate-200">
                    <nav className="-mb-px flex gap-6">
                        <button onClick={() => setActiveTab('visao_geral')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'visao_geral' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            Visão Geral
                        </button>
                        <button onClick={() => setActiveTab('extrato')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'extrato' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            Extrato Detalhado
                        </button>
                        <button onClick={() => setActiveTab('comissoes')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'comissoes' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            Comissões a Pagar
                        </button>
                    </nav>
                </div>

                {/* TAB CONTENT */}

                {activeTab === 'visao_geral' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Fluxo de Receita vs. Despesa">
                            <div className="h-64">
                                {/* Simulating simple visual comparison since SafeBar is time-based */}
                                <div className="flex h-full items-end justify-center gap-16 pb-4">
                                    <div className="w-24 bg-green-500 rounded-t-lg transition-all duration-500 relative group" style={{ height: `${Math.min(100, (metrics.income / 3000) * 100)}%` }}>
                                        <span className="absolute -top-6 w-full text-center font-bold text-green-700 text-xs">Receita</span>
                                    </div>
                                    <div className="w-24 bg-red-500 rounded-t-lg transition-all duration-500 relative group" style={{ height: `${Math.min(100, (metrics.expense / 3000) * 100)}%` }}>
                                        <span className="absolute -top-6 w-full text-center font-bold text-red-700 text-xs">Despesa</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                        <Card title="Distribuição de Despesas">
                            <div className="h-64">
                                <SafePie 
                                    data={chartData}
                                    colors={['#f87171', '#fb923c', '#facc15', '#a78bfa', '#60a5fa']}
                                />
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'extrato' && (
                    <Card className="overflow-hidden p-0">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3 font-bold">Data</th>
                                    <th className="px-6 py-3 font-bold">Descrição</th>
                                    <th className="px-6 py-3 font-bold">Categoria</th>
                                    <th className="px-6 py-3 font-bold text-right">Valor</th>
                                    <th className="px-6 py-3 font-bold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-3 text-slate-600">{format(new Date(t.date), 'dd/MM/yyyy')}</td>
                                        <td className="px-6 py-3 font-medium text-slate-800">{t.description}</td>
                                        <td className="px-6 py-3">
                                            <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs capitalize">
                                                {t.category}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-3 text-right font-bold ${t.type === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === 'despesa' ? '- ' : '+ '}
                                            R$ {t.amount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {t.status === 'pago' ? (
                                                <CheckCircle className="w-4 h-4 text-green-500 mx-auto"/>
                                            ) : (
                                                <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto"/>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                                            Nenhuma transação encontrada neste período.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </Card>
                )}

                {activeTab === 'comissoes' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {professionals.map(prof => {
                            // Calculate commission based on transactions tagged with this professional
                            const profRevenue = transactions
                                .filter(t => t.professionalId === prof.id && t.type === 'receita')
                                .reduce((acc, t) => acc + t.amount, 0);
                            const commission = profRevenue * 0.5; // 50% rule example

                            return (
                                <div key={prof.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                    <img src={prof.avatarUrl} alt={prof.name} className="w-14 h-14 rounded-full object-cover" />
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-800">{prof.name}</h3>
                                        <div className="flex justify-between mt-2 text-sm">
                                            <span className="text-slate-500">Gerado: <b className="text-slate-700">R$ {profRevenue.toFixed(2)}</b></span>
                                            <span className="text-green-600 font-bold">Comissão: R$ {commission.toFixed(2)}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                            <div className="bg-green-500 h-full" style={{ width: '50%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

            </div>
            
            {/* Modal */}
            {showModal && (
                <NewTransactionModal 
                    type={showModal} 
                    onClose={() => setShowModal(null)} 
                    onSave={handleAddTransaction}
                />
            )}
        </div>
    );
};

export default FinanceiroView;
