
import React, { useState, useMemo, useEffect } from 'react';
import { 
    BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, 
    ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText,
    Users, Scissors, Wallet, Clock, ChevronRight as ArrowRight,
    // FIX: Added AlertTriangle to the imports from lucide-react
    Loader2, Search, X, CheckCircle, AlertCircle, Filter, AlertTriangle
} from 'lucide-react';
import { format, addMonths, isSameMonth, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR as pt } from 'date-fns/locale/pt-BR';
import Card from '../shared/Card';
import SafePie from '../charts/SafePie';
import SafeBar from '../charts/SafeBar';
import { mockTransactions, initialAppointments, professionals } from '../../data/mockData';
import { supabase } from '../../services/supabaseClient';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type TabType = 'overview' | 'export';

interface ReportDefinition {
    id: string;
    title: string;
    description: string;
    icon: any;
    color: string;
    bg: string;
    table: string; // Tabela alvo no Supabase
}

const reportsRegistry: ReportDefinition[] = [
    { id: 'finance', title: 'Fluxo Financeiro', description: 'Entradas e saídas detalhadas para contabilidade.', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', table: 'financial_transactions' },
    { id: 'commissions', title: 'Comissões da Equipe', description: 'Cálculo de repasse por profissional e serviço.', icon: Wallet, color: 'text-orange-600', bg: 'bg-orange-50', table: 'team_members' },
    { id: 'appointments', title: 'Histórico de Agenda', description: 'Lista completa de atendimentos e status.', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', table: 'appointments' },
    { id: 'clients', title: 'Base de Clientes', description: 'Dados de contato e frequência de visitas.', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', table: 'clients' },
];

const RelatoriosView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Ações de Navegação de Data ---
    const handlePrevMonth = () => setCurrentDate(prev => addMonths(prev, -1));
    const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

    // --- Processamento do Dashboard (Overview) ---
    const financialStats = useMemo(() => {
        const income = mockTransactions
            .filter(t => t.type === 'receita' && isSameMonth(new Date(t.date), currentDate))
            .reduce((sum, t) => sum + t.amount, 0);
            
        const expense = mockTransactions
            .filter(t => t.type === 'despesa' && isSameMonth(new Date(t.date), currentDate))
            .reduce((sum, t) => sum + t.amount, 0);
            
        const profit = income - expense;
        const margin = income > 0 ? (profit / income) * 100 : 0;
        return { income, expense, profit, margin };
    }, [currentDate]);

    const monthAppointments = useMemo(() => {
        return initialAppointments.filter(a => 
            isSameMonth(new Date(a.start), currentDate) && 
            a.status === 'concluido'
        );
    }, [currentDate]);

    // --- Engine de Busca de Dados para Exportação ---
    const fetchReportData = async (report: ReportDefinition) => {
        setIsLoading(true);
        setSelectedReport(report);
        
        try {
            const start = startOfMonth(currentDate).toISOString();
            const end = endOfMonth(currentDate).toISOString();

            let query = supabase.from(report.table).select('*');

            // Filtros inteligentes baseados na tabela
            if (report.table === 'financial_transactions' || report.table === 'appointments') {
                query = query.gte('date', start).lte('date', end);
            } else if (report.table === 'clients') {
                query = query.order('nome');
            }

            const { data, error } = await query;
            if (error) throw error;
            setPreviewData(data || []);
        } catch (e) {
            console.error("Erro ao carregar relatório:", e);
            setPreviewData([]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Lógica de Exportação ---
    const exportExcel = () => {
        if (!previewData.length) return;
        const ws = XLSX.utils.json_to_sheet(previewData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Relatorio");
        XLSX.writeFile(wb, `BelareStudio_${selectedReport?.id}_${format(currentDate, 'MM_yyyy')}.xlsx`);
    };

    const exportPDF = () => {
        if (!previewData.length) return;
        const doc = new jsPDF('landscape');
        const title = `${selectedReport?.title} - ${format(currentDate, 'MMMM yyyy', { locale: pt })}`;
        
        doc.setFontSize(18);
        doc.text("BelareStudio - Gestão Inteligente", 14, 15);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(title, 14, 22);

        const headers = Object.keys(previewData[0]);
        const dataRows = previewData.map(row => Object.values(row).map(val => String(val ?? '')));

        autoTable(doc, {
            startY: 30,
            head: [headers],
            body: dataRows,
            theme: 'striped',
            headStyles: { fillStyle: 'fill', fillColor: [249, 115, 22] }, // Orange color
            styles: { fontSize: 8 }
        });

        doc.save(`${selectedReport?.id}_${format(currentDate, 'MM_yyyy')}.pdf`);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans text-left">
            {/* Header Global */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 z-30 shadow-sm">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
                        <BarChart3 className="text-orange-500" size={28} />
                        Inteligência & Relatórios
                    </h1>
                    <div className="flex items-center gap-1 mt-1">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><ChevronLeft size={16}/></button>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[120px] text-center">
                            {format(currentDate, 'MMMM yyyy', { locale: pt })}
                        </span>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><ChevronRight size={16}/></button>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${activeTab === 'overview' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Visão Geral
                    </button>
                    <button 
                        onClick={() => setActiveTab('export')}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${activeTab === 'export' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Exportação & Listas
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8">
                    
                    {/* --- ABA 1: DASHBOARD VISUAL --- */}
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* KPIs Rápidos */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="p-0 overflow-hidden border-none shadow-sm">
                                    <div className="p-5 bg-white border-l-4 border-emerald-500">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Faturamento</p>
                                        <h3 className="text-xl font-black text-slate-800">{financialStats.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
                                    </div>
                                </Card>
                                <Card className="p-0 overflow-hidden border-none shadow-sm">
                                    <div className="p-5 bg-white border-l-4 border-rose-500">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Despesas</p>
                                        <h3 className="text-xl font-black text-slate-800">{financialStats.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
                                    </div>
                                </Card>
                                <Card className="p-0 overflow-hidden border-none shadow-sm">
                                    <div className="p-5 bg-white border-l-4 border-blue-500">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Lucro Real</p>
                                        <h3 className="text-xl font-black text-slate-800">{financialStats.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
                                    </div>
                                </Card>
                                <Card className="p-0 overflow-hidden border-none shadow-sm">
                                    <div className="p-5 bg-white border-l-4 border-purple-500">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Atendimentos</p>
                                        <h3 className="text-xl font-black text-slate-800">{monthAppointments.length}</h3>
                                    </div>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <Card title="Receita por Categoria" className="lg:col-span-1 rounded-[32px]">
                                    <div className="h-64 mt-4">
                                        <SafePie 
                                            data={Object.entries(monthAppointments.reduce((acc: any, curr) => {
                                                const cat = curr.service.category || 'Outros';
                                                acc[cat] = (acc[cat] || 0) + curr.service.price;
                                                return acc;
                                            }, {})).map(([name, value]) => ({ name, receita: value }))}
                                            colors={['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444']}
                                        />
                                    </div>
                                </Card>
                                <Card title="Desempenho da Equipe" className="lg:col-span-2 rounded-[32px]">
                                    <div className="h-64 mt-4">
                                        <SafeBar 
                                            data={professionals.map(p => ({
                                                name: p.name.split(' ')[0],
                                                minutosOcupados: 480, // Mock
                                                ocupacao: Math.floor(Math.random() * 60) + 30
                                            }))}
                                            color="#f97316"
                                        />
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* --- ABA 2: CENTRAL DE EXPORTAÇÃO (ESTILO SALÃO99) --- */}
                    {activeTab === 'export' && !selectedReport && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Escolha um tipo de relatório</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {reportsRegistry.map((report) => (
                                    <button
                                        key={report.id}
                                        onClick={() => fetchReportData(report)}
                                        className="bg-white p-6 rounded-[32px] border-2 border-slate-100 hover:border-orange-50 hover:shadow-xl transition-all text-left group active:scale-95"
                                    >
                                        <div className={`w-14 h-14 rounded-2xl ${report.bg} ${report.color} flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform`}>
                                            <report.icon size={28} />
                                        </div>
                                        <h3 className="font-black text-slate-800 text-lg leading-tight mb-2 group-hover:text-orange-600 transition-colors">
                                            {report.title}
                                        </h3>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
                                            {report.description}
                                        </p>
                                        <div className="flex items-center gap-2 text-orange-500 font-black text-[10px] uppercase tracking-widest">
                                            Gerar Agora <ArrowRight size={14} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- VIEW: PREVIA DO RELATÓRIO SELECIONADO --- */}
                    {selectedReport && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setSelectedReport(null)}
                                        className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800">{selectedReport.title}</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{previewData.length} registros encontrados</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button 
                                        onClick={exportExcel}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                                    >
                                        <FileSpreadsheet size={18} /> Excel
                                    </button>
                                    <button 
                                        onClick={exportPDF}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all active:scale-95"
                                    >
                                        <FileText size={18} /> PDF
                                    </button>
                                </div>
                            </div>

                            <Card className="rounded-[40px] border-slate-200 p-0 overflow-hidden shadow-xl">
                                {isLoading ? (
                                    <div className="p-20 flex flex-col items-center justify-center text-slate-400">
                                        <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
                                        <p className="font-black uppercase tracking-widest text-xs">Compilando dados...</p>
                                    </div>
                                ) : previewData.length === 0 ? (
                                    <div className="p-20 text-center">
                                        <AlertTriangle size={48} className="text-slate-200 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold">Nenhum dado encontrado para este período.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 bg-slate-800 text-white z-10">
                                                <tr>
                                                    {Object.keys(previewData[0]).map(key => (
                                                        <th key={key} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                                            {key.replace('_', ' ')}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {previewData.map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                        {Object.values(row).map((val: any, j) => (
                                                            <td key={j} className="px-6 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                                                                {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '---')}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};

export default RelatoriosView;
