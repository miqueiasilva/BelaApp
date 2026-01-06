
import React, { useState, useMemo, useEffect, useRef } from 'react';
/* Added RefreshCw and Info to lucide-react imports */
import { 
    BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, 
    ChevronLeft, ChevronRight, FileSpreadsheet, FileText,
    Users, Scissors, Wallet, ArrowRight, Loader2, 
    AlertTriangle, FilePieChart, Table, CheckCircle2,
    BarChart, PieChart as PieChartIcon, Search, Printer, 
    Download, Filter, CalendarDays, Clock, CreditCard, Banknote, Smartphone,
    RefreshCw, Info
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, subDays, isBefore } from 'date-fns';
import { ptBR as pt } from 'date-fns/locale/pt-BR';
import Card from '../shared/Card';
import SafePie from '../charts/SafePie';
import SafeBar from '../charts/SafeBar';
import { supabase } from '../../services/supabaseClient';

// Bibliotecas de Exportação
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type TabType = 'overview' | 'financeiro' | 'export';

const RelatoriosView: React.FC = () => {
    // --- Safe Hydration Guard ---
    const [isMounted, setIsMounted] = useState(false);
    
    // --- Filtros ---
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [selectedProf, setSelectedProf] = useState<string>('all');
    const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'paid' | 'pending'>('all');
    
    // --- Dados ---
    const [transactions, setTransactions] = useState<any[]>([]);
    const [professionals, setProfessionals] = useState<any[]>([]);
    const [prevBalance, setPrevBalance] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        fetchProfessionals();
    }, []);

    // Sincroniza dados ao mudar filtros ou aba
    useEffect(() => {
        if (isMounted && (activeTab === 'financeiro' || activeTab === 'overview')) {
            fetchFinancialData();
        }
    }, [isMounted, activeTab, startDate, endDate, selectedProf, selectedType, selectedStatus]);

    const fetchProfessionals = async () => {
        const { data } = await supabase.from('team_members').select('id, name').order('name');
        if (data) setProfessionals(data);
    };

    const fetchFinancialData = async () => {
        setIsLoading(true);
        try {
            // 1. Cálculo do Saldo Anterior (Total antes da startDate)
            const { data: oldTrans } = await supabase
                .from('financial_transactions')
                .select('amount, type')
                .lt('date', startDate)
                .neq('status', 'cancelado');
            
            const prev = (oldTrans || []).reduce((acc, t) => {
                return t.type === 'income' ? acc + Number(t.amount) : acc - Number(t.amount);
            }, 0);
            setPrevBalance(prev);

            // 2. Busca de Transações do Período com Filtros
            let query = supabase
                .from('financial_transactions')
                .select('*')
                .gte('date', startDate)
                .lte('date', `${endDate}T23:59:59`)
                .neq('status', 'cancelado')
                .order('date', { ascending: false });

            if (selectedProf !== 'all') query = query.eq('professional_id', selectedProf);
            if (selectedType !== 'all') query = query.eq('type', selectedType);
            if (selectedStatus !== 'all') query = query.eq('status', selectedStatus === 'paid' ? 'paid' : 'pending');

            const { data, error } = await query;
            if (error) throw error;
            setTransactions(data || []);

        } catch (err) {
            console.error("Erro ao carregar relatório:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Cálculos de Resumo ---
    const summary = useMemo(() => {
        const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
        return {
            income,
            expense,
            periodBalance: income - expense,
            finalBalance: prevBalance + (income - expense)
        };
    }, [transactions, prevBalance]);

    // --- Exportação ---
    const exportToExcel = () => {
        setIsExporting(true);
        const data = transactions.map(t => ({
            Data: format(parseISO(t.date), 'dd/MM/yyyy HH:mm'),
            Descrição: t.description,
            Tipo: t.type === 'income' ? 'Receita' : 'Despesa',
            Categoria: t.category || 'Geral',
            Método: t.payment_method || '---',
            Status: t.status === 'paid' ? 'Liquidado' : 'Pendente',
            Valor: Number(t.amount)
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Financeiro");
        XLSX.writeFile(wb, `Relatorio_Financeiro_${startDate}_a_${endDate}.xlsx`);
        setIsExporting(false);
    };

    const exportToPDF = () => {
        setIsExporting(true);
        const doc = new jsPDF('landscape');
        doc.setFontSize(18);
        doc.text("BELARESTUDIO - RELATÓRIO FINANCEIRO", 14, 20);
        doc.setFontSize(10);
        doc.text(`Período: ${format(parseISO(startDate), 'dd/MM/yyyy')} até ${format(parseISO(endDate), 'dd/MM/yyyy')}`, 14, 28);
        
        // Adiciona Resumo de Caixa no PDF
        autoTable(doc, {
            startY: 35,
            head: [['Saldo Anterior', 'Entradas', 'Saídas', 'Saldo Final']],
            body: [[
                `R$ ${prevBalance.toFixed(2)}`,
                `R$ ${summary.income.toFixed(2)}`,
                `R$ ${summary.expense.toFixed(2)}`,
                `R$ ${summary.finalBalance.toFixed(2)}`
            ]],
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85] }
        });

        const tableBody = transactions.map(t => [
            format(parseISO(t.date), 'dd/MM/yy HH:mm'),
            t.description,
            t.category || '---',
            t.payment_method?.toUpperCase() || '---',
            t.status === 'paid' ? 'PAGO' : 'PENDENTE',
            { content: `R$ ${Number(t.amount).toFixed(2)}`, styles: { halign: 'right', fontStyle: t.type === 'expense' ? 'bold' : 'normal' } }
        ]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['Data', 'Descrição', 'Categoria', 'Método', 'Status', 'Valor']],
            body: tableBody,
            headStyles: { fillColor: [249, 115, 22] },
            styles: { fontSize: 8 }
        });

        doc.save(`Financeiro_${startDate}_${endDate}.pdf`);
        setIsExporting(false);
    };

    if (!isMounted) return null;

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans text-left">
            {/* Header com Navegação de Abas */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                        <BarChart3 size={24} />
                    </div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">INTELIGÊNCIA FINANCEIRA</h1>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    <button onClick={() => setActiveTab('overview')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'overview' ? 'bg-white shadow-md text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}>Dashboard</button>
                    <button onClick={() => setActiveTab('financeiro')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'financeiro' ? 'bg-white shadow-md text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}>Extrato ERP</button>
                    <button onClick={() => setActiveTab('export')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'export' ? 'bg-white shadow-md text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}>Exportação</button>
                </div>
            </header>

            {/* BARRA DE FILTROS AVANÇADA */}
            <div className="bg-white border-b border-slate-200 p-4 z-20">
                <div className="max-w-7xl mx-auto flex flex-wrap items-end gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Início</label>
                        <div className="relative">
                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-100 outline-none" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Fim</label>
                        <div className="relative">
                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-100 outline-none" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Profissional</label>
                        <select value={selectedProf} onChange={e => setSelectedProf(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-orange-100">
                            <option value="all">Todos os Membros</option>
                            {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Movimentação</label>
                        <select value={selectedType} onChange={e => setSelectedType(e.target.value as any)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-orange-100">
                            <option value="all">Todos os Tipos</option>
                            <option value="income">Apenas Receitas</option>
                            <option value="expense">Apenas Despesas</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as any)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-orange-100">
                            <option value="all">Todos os Status</option>
                            <option value="paid">Liquidados</option>
                            <option value="pending">Pendentes</option>
                        </select>
                    </div>
                    <button onClick={fetchFinancialData} className="p-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all shadow-md active:scale-95">
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8">
                    
                    {/* SUMMARY CARDS */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Anterior</p>
                            <div className="text-xl font-black text-slate-600">R$ {prevBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="bg-white p-5 rounded-3xl border-l-4 border-l-emerald-500 shadow-sm">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Entradas (Período)</p>
                            <div className="text-xl font-black text-slate-800">R$ {summary.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="bg-white p-5 rounded-3xl border-l-4 border-l-rose-500 shadow-sm">
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Saídas (Período)</p>
                            <div className="text-xl font-black text-slate-800">R$ {summary.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="bg-slate-900 p-5 rounded-3xl text-white shadow-xl shadow-slate-200 border border-slate-800">
                            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Saldo Final Atual</p>
                            <div className="text-xl font-black">R$ {summary.finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                    </div>

                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
                            <Card title="Composição de Receita" className="lg:col-span-1 rounded-[32px]">
                                <div className="h-64 mt-4">
                                    <SafePie 
                                        data={[
                                            { name: 'Serviços', receita: summary.income * 0.8 },
                                            { name: 'Produtos', receita: summary.income * 0.2 }
                                        ]}
                                        colors={['#f97316', '#3b82f6']}
                                    />
                                </div>
                            </Card>
                            <Card title="Fluxo por Categoria" className="lg:col-span-2 rounded-[32px]">
                                <div className="h-64 mt-4">
                                    <SafeBar 
                                        data={transactions.slice(0, 8).map(t => ({
                                            name: t.category || 'Geral',
                                            ocupacao: (Number(t.amount) / (summary.income || 1)) * 100,
                                            minutosOcupados: 60
                                        }))}
                                        color="#f97316"
                                    />
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'financeiro' && (
                        <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 flex flex-col min-h-[500px]">
                            {isLoading ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                    <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Processando extrato contábil...</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto custom-scrollbar flex-1">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-slate-900 text-white z-20">
                                            <tr>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Data/Hora</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Descrição</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Categoria</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Método</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Status</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {transactions.map((t, i) => (
                                                <tr key={t.id || i} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-6 py-4 text-[11px] font-bold text-slate-400 whitespace-nowrap">
                                                        {format(parseISO(t.date), 'dd/MM/yy HH:mm')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-xs font-black text-slate-700 group-hover:text-orange-600 transition-colors">{t.description}</div>
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase">{t.type === 'income' ? 'Entrada' : 'Saída'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-slate-200">
                                                            {t.category || 'Geral'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase">
                                                            {t.payment_method === 'pix' && <Smartphone size={12} className="text-teal-500"/>}
                                                            {t.payment_method === 'dinheiro' && <Banknote size={12} className="text-emerald-500"/>}
                                                            {(t.payment_method?.includes('cartao')) && <CreditCard size={12} className="text-blue-500"/>}
                                                            {t.payment_method || '---'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${t.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                                            {t.status === 'paid' ? 'LIQUIDADO' : 'PENDENTE'}
                                                        </span>
                                                    </td>
                                                    <td className={`px-6 py-4 text-right font-black text-sm tracking-tighter ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {t.type === 'income' ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {/* RODAPÉ DA TABELA */}
                                        <tfoot className="bg-slate-50 border-t-2 border-slate-100 font-black">
                                            <tr>
                                                <td colSpan={5} className="px-6 py-5 text-right text-[10px] text-slate-400 uppercase tracking-widest">Saldo do Período Filtrado:</td>
                                                <td className={`px-6 py-5 text-right text-lg tracking-tighter ${summary.periodBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    R$ {summary.periodBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'export' && (
                        <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                            <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-2xl text-center space-y-8">
                                <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-[32px] flex items-center justify-center mx-auto shadow-lg">
                                    <Download size={48} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Central de Arquivos</h2>
                                    <p className="text-slate-400 font-medium text-sm mt-2">Gere documentos contábeis prontos para envio ao seu escritório de contabilidade.</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button 
                                        onClick={exportToExcel}
                                        disabled={isExporting || transactions.length === 0}
                                        className="flex items-center justify-center gap-4 p-6 bg-emerald-50 text-emerald-700 rounded-3xl border-2 border-emerald-100 hover:border-emerald-500 transition-all group active:scale-95 disabled:opacity-50"
                                    >
                                        <FileSpreadsheet size={32} />
                                        <div className="text-left">
                                            <p className="font-black uppercase text-xs tracking-widest">Excel (XLSX)</p>
                                            <p className="text-[10px] font-bold opacity-60">Dados Brutos</p>
                                        </div>
                                    </button>
                                    <button 
                                        onClick={exportToPDF}
                                        disabled={isExporting || transactions.length === 0}
                                        className="flex items-center justify-center gap-4 p-6 bg-rose-50 text-rose-700 rounded-3xl border-2 border-rose-100 hover:border-rose-500 transition-all group active:scale-95 disabled:opacity-50"
                                    >
                                        <FileText size={32} />
                                        <div className="text-left">
                                            <p className="font-black uppercase text-xs tracking-widest">PDF Gerencial</p>
                                            <p className="text-[10px] font-bold opacity-60">Formatação ERP</p>
                                        </div>
                                    </button>
                                </div>

                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-xl shadow-sm text-orange-500"><Info size={20}/></div>
                                    <p className="text-left text-[11px] font-bold text-slate-500 leading-relaxed uppercase tracking-tighter">
                                        Os arquivos gerados respeitam os filtros ativos (Data, Profissional e Tipo). Certifique-se de aplicar os filtros antes de baixar.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default RelatoriosView;
