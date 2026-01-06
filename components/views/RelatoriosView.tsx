
import React, { useState, useMemo, useEffect } from 'react';
import { 
    BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, 
    ChevronLeft, ChevronRight, FileSpreadsheet, FileText,
    Users, Scissors, Wallet, ArrowRight, Loader2, 
    AlertTriangle, FilePieChart, Table, CheckCircle2,
    BarChart, PieChart as PieChartIcon, Search, Printer, 
    Download, Filter, CalendarDays, Clock, CreditCard, Banknote, Smartphone,
    RefreshCw, Info, UserCheck, Zap, RotateCcw, MessageCircle, 
    Package, AlertOctagon, Layers, Coins, CheckSquare, Square
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, differenceInDays } from 'date-fns';
import { ptBR as pt } from 'date-fns/locale/pt-BR';
import Card from '../shared/Card';
import SafePie from '../charts/SafePie';
import SafeBar from '../charts/SafeBar';
import { supabase } from '../../services/supabaseClient';

// Bibliotecas de Exportação
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type TabType = 'overview' | 'financeiro' | 'comissoes' | 'clientes' | 'recuperacao' | 'estoque' | 'export';

interface ProductData {
    id: number;
    name: string;
    cost_price: number;
    price: number;
    stock_quantity: number;
    min_stock: number;
    active: boolean;
}

interface CommissionRow {
    id: string;
    date: string;
    description: string;
    professional_name: string;
    gross_value: number;
    tax_value: number;
    product_cost: number;
    commission_rate: number;
    net_base: number;
    final_commission: number;
    status: 'pago' | 'pendente';
}

const RelatoriosView: React.FC = () => {
    const [isMounted, setIsMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [isLoading, setIsLoading] = useState(false);
    
    // Filtros
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    
    // Dados
    const [transactions, setTransactions] = useState<any[]>([]);
    const [products, setProducts] = useState<ProductData[]>([]);
    const [commissions, setCommissions] = useState<CommissionRow[]>([]);
    const [prevBalance, setPrevBalance] = useState(0);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted) {
            refreshData();
        }
    }, [isMounted, activeTab, startDate, endDate]);

    const refreshData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'financeiro' || activeTab === 'overview') await fetchFinancialData();
            if (activeTab === 'estoque') await fetchStockData();
            if (activeTab === 'comissoes') await fetchCommissionData();
        } finally {
            setIsLoading(false);
        }
    };

    const fetchFinancialData = async () => {
        const { data: oldTrans } = await supabase.from('financial_transactions').select('amount, type').lt('date', startDate).neq('status', 'cancelado');
        const prev = (oldTrans || []).reduce((acc, t) => t.type === 'income' ? acc + Number(t.amount) : acc - Number(t.amount), 0);
        setPrevBalance(prev);

        let query = supabase.from('financial_transactions').select('*').gte('date', startDate).lte('date', `${endDate}T23:59:59`).neq('status', 'cancelado').order('date', { ascending: false });
        const { data } = await query;
        setTransactions(data || []);
    };

    const fetchStockData = async () => {
        const { data } = await supabase.from('products').select('*').order('name');
        setProducts(data || []);
    };

    const fetchCommissionData = async () => {
        // Busca Transações e Membros da Equipe simultaneamente
        const [transRes, teamRes] = await Promise.all([
            supabase.from('financial_transactions').select('*').gte('date', startDate).lte('date', `${endDate}T23:59:59`).eq('type', 'income').neq('status', 'cancelado'),
            supabase.from('team_members').select('id, name, commission_rate')
        ]);

        const team = teamRes.data || [];
        const trans = transRes.data || [];

        const rows: CommissionRow[] = trans.map(t => {
            const prof = team.find(p => p.id === t.professional_id);
            const grossValue = Number(t.amount);
            const taxValue = grossValue - Number(t.net_value || grossValue);
            // Simulação de custo de produto (em um ERP real viria de uma tabela de consumo vinculada)
            const productCost = t.category === 'produto' ? grossValue * 0.3 : 0; 
            const rate = prof?.commission_rate || 30;
            
            const netBase = grossValue - taxValue - productCost;
            const finalCommission = netBase * (rate / 100);

            return {
                id: t.id,
                date: t.date,
                description: t.description,
                professional_name: prof?.name || 'Não vinculado',
                gross_value: grossValue,
                tax_value: taxValue,
                product_cost: productCost,
                commission_rate: rate,
                net_base: netBase,
                final_commission: finalCommission,
                status: t.payout_status || 'pendente'
            };
        });

        setCommissions(rows);
    };

    const handleTogglePayout = async (id: string, current: string) => {
        const next = current === 'pago' ? 'pendente' : 'pago';
        const { error } = await supabase.from('financial_transactions').update({ payout_status: next }).eq('id', id);
        if (!error) {
            setCommissions(prev => prev.map(c => c.id === id ? { ...c, status: next } : c));
        }
    };

    // --- Exportação ---
    const exportStockExcel = () => {
        const data = products.map(p => ({
            Produto: p.name,
            Custo: p.cost_price,
            Venda: p.price,
            Estoque: p.stock_quantity,
            'Patrimônio Imobilizado': p.cost_price * p.stock_quantity,
            Status: p.stock_quantity <= p.min_stock ? 'REPOR' : 'OK'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Estoque");
        XLSX.writeFile(wb, `Inventario_Patrimonial_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
    };

    // --- Resumos e KPIs ---
    const stockSummary = useMemo(() => {
        const totalInvestment = products.reduce((acc, p) => acc + (p.cost_price * p.stock_quantity), 0);
        const lowItems = products.filter(p => p.stock_quantity <= p.min_stock).length;
        return { totalInvestment, lowItems };
    }, [products]);

    const summary = useMemo(() => {
        const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
        return { income, expense, balance: income - expense, final: prevBalance + (income - expense) };
    }, [transactions, prevBalance]);

    if (!isMounted) return null;

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans text-left">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                        <BarChart3 size={24} />
                    </div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">BI & BACKOFFICE</h1>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-hide max-w-full">
                    <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white shadow-md text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}>Dashboard</button>
                    <button onClick={() => setActiveTab('financeiro')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${activeTab === 'financeiro' ? 'bg-white shadow-md text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}>Financeiro</button>
                    <button onClick={() => setActiveTab('comissoes')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${activeTab === 'comissoes' ? 'bg-white shadow-md text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}>Comissões</button>
                    <button onClick={() => setActiveTab('estoque')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${activeTab === 'estoque' ? 'bg-white shadow-md text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}>Estoque</button>
                    <button onClick={() => setActiveTab('export')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${activeTab === 'export' ? 'bg-white shadow-md text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}>Exportar</button>
                </div>
            </header>

            {/* BARRA DE FILTROS */}
            {activeTab !== 'estoque' && activeTab !== 'export' && (
                <div className="bg-white border-b border-slate-200 p-4">
                    <div className="max-w-7xl mx-auto flex flex-wrap items-end gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fim</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none" />
                        </div>
                        <button onClick={refreshData} className="p-2.5 bg-slate-800 text-white rounded-xl shadow-md active:scale-95"><RefreshCw size={16} className={isLoading ? 'animate-spin' : ''}/></button>
                    </div>
                </div>
            )}

            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8 pb-20">
                    
                    {/* VIEW: ESTOQUE & PATRIMÔNIO */}
                    {activeTab === 'estoque' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center"><Package size={24}/></div>
                                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patrimônio Imobilizado</p><h3 className="text-2xl font-black text-slate-800">R$ {stockSummary.totalInvestment.toLocaleString('pt-BR')}</h3></div>
                                </div>
                                <div className={`p-6 rounded-[32px] flex items-center gap-4 border ${stockSummary.lowItems > 0 ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stockSummary.lowItems > 0 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-300'}`}><AlertOctagon size={24}/></div>
                                    <div><p className="text-[10px] font-black uppercase tracking-widest">Alertas de Reposição</p><h3 className="text-2xl font-black">{stockSummary.lowItems} Itens Críticos</h3></div>
                                </div>
                                <button onClick={exportStockExcel} className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl flex items-center justify-between group hover:bg-black transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/10 text-orange-400 rounded-2xl flex items-center justify-center"><FileSpreadsheet size={24}/></div>
                                        <div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventário</p><h3 className="text-lg font-black">Exportar Planilha</h3></div>
                                    </div>
                                    <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                                </button>
                            </div>

                            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-900 text-white">
                                            <tr>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Produto</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Custo Unit.</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Preço Venda</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Qtd Atual</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Status</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Subtotal Custo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {products.map(p => (
                                                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${p.stock_quantity <= p.min_stock ? 'bg-rose-50/30' : ''}`}>
                                                    <td className="px-6 py-4 font-black text-slate-700">{p.name}</td>
                                                    <td className="px-6 py-4 text-right text-slate-400 font-bold">R$ {p.cost_price.toFixed(2)}</td>
                                                    <td className="px-6 py-4 text-right text-slate-600 font-bold">R$ {p.price.toFixed(2)}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-3 py-1 rounded-lg font-black text-xs ${p.stock_quantity <= p.min_stock ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                                                            {p.stock_quantity} un
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {p.stock_quantity <= p.min_stock ? (
                                                            <span className="flex items-center justify-center gap-1 text-[9px] font-black text-rose-500 uppercase">
                                                                <AlertTriangle size={12}/> Repor Urgente
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center justify-center gap-1 text-[9px] font-black text-emerald-500 uppercase">
                                                                <CheckCircle2 size={12}/> Normal
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-slate-800">
                                                        R$ {(p.cost_price * p.stock_quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VIEW: MAPA DE COMISSÕES LÍQUIDAS */}
                    {activeTab === 'comissoes' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
                                    <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform"><Coins size={120}/></div>
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Repasse Total Provisionado</p>
                                        <h3 className="text-4xl font-black text-orange-400">R$ {commissions.reduce((acc, c) => acc + c.final_commission, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-4 flex items-center gap-2">
                                            <Info size={12}/> Cálculo baseado no valor líquido de impostos e insumos.
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Resumo por Status</p>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Aguardando Pagamento</span><span className="font-black text-amber-600">R$ {commissions.filter(c => c.status !== 'pago').reduce((acc, c) => acc + c.final_commission, 0).toFixed(2)}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Já Liquidados</span><span className="font-black text-emerald-600">R$ {commissions.filter(c => c.status === 'pago').reduce((acc, c) => acc + c.final_commission, 0).toFixed(2)}</span></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-900 text-white">
                                            <tr>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Data</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Profissional</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Bruto</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Custos/Taxas</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Base Líquida</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Comissão ({commissions[0]?.commission_rate}%)</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Pago?</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {commissions.map(c => (
                                                <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-6 py-4 text-[11px] font-bold text-slate-400">{format(parseISO(c.date), 'dd/MM')}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-xs font-black text-slate-700">{c.professional_name}</div>
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[120px]">{c.description}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-slate-400">R$ {c.gross_value.toFixed(2)}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-rose-400">- R$ {(c.tax_value + c.product_cost).toFixed(2)}</td>
                                                    <td className="px-6 py-4 text-right font-black text-slate-600 bg-slate-50/50">R$ {c.net_base.toFixed(2)}</td>
                                                    <td className="px-6 py-4 text-right font-black text-orange-600 text-sm">R$ {c.final_commission.toFixed(2)}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button 
                                                            onClick={() => handleTogglePayout(c.id, c.status)}
                                                            className={`p-2 rounded-xl transition-all ${c.status === 'pago' ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 bg-slate-50 hover:text-orange-500'}`}
                                                        >
                                                            {c.status === 'pago' ? <CheckSquare size={20}/> : <Square size={20}/>}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MANTÉM OS OUTROS RELATÓRIOS JÁ EXISTENTES ABAIXO... */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
                             <div className="bg-white p-5 border-l-4 border-l-emerald-500 rounded-2xl shadow-sm">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entradas</div>
                                <div className="text-xl font-black text-slate-800">R$ {summary.income.toLocaleString('pt-BR')}</div>
                            </div>
                            <div className="bg-white p-5 border-l-4 border-l-rose-500 rounded-2xl shadow-sm">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saídas</div>
                                <div className="text-xl font-black text-slate-800">R$ {summary.expense.toLocaleString('pt-BR')}</div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default RelatoriosView;
