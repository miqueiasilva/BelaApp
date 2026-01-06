
import React, { useState, useMemo, useEffect } from 'react';
import { 
    BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, 
    ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText,
    Users, Scissors, Wallet, Clock, ChevronRight as ArrowRight,
    Loader2, Search, X, CheckCircle, AlertCircle, Filter, AlertTriangle,
    FilePieChart, Receipt, UserCheck, Briefcase, Table
} from 'lucide-react';
import { format, addMonths, isSameMonth, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR as pt } from 'date-fns/locale/pt-BR';
import Card from '../shared/Card';
import SafePie from '../charts/SafePie';
import SafeBar from '../charts/SafeBar';
import { mockTransactions, initialAppointments, professionals } from '../../data/mockData';
import { supabase } from '../../services/supabaseClient';

// Bibliotecas de Exportação
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type TabType = 'overview' | 'export';

interface ReportColumn {
    header: string;
    key: string;
    format?: (v: any) => string;
}

interface ReportDefinition {
    id: string;
    title: string;
    description: string;
    icon: any;
    color: string;
    bg: string;
    table: string; 
    columns: ReportColumn[];
}

// Configuração centralizada dos relatórios disponíveis na Central de Exportação
const reportsRegistry: ReportDefinition[] = [
    { 
        id: 'financeiro', 
        title: 'Movimentação Financeira', 
        description: 'Relatório contábil de todas as entradas e saídas do período.', 
        icon: DollarSign, 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-50', 
        table: 'financial_transactions',
        columns: [
            { header: 'Data', key: 'date', format: (v) => format(parseISO(v), 'dd/MM/yyyy HH:mm') },
            { header: 'Descrição', key: 'description' },
            { header: 'Categoria', key: 'category' },
            { header: 'Tipo', key: 'type' },
            { header: 'Método', key: 'payment_method' },
            { header: 'Valor Bruto', key: 'amount', format: (v) => `R$ ${Number(v).toFixed(2)}` },
            { header: 'Líquido', key: 'net_value', format: (v) => `R$ ${Number(v).toFixed(2)}` }
        ]
    },
    { 
        id: 'comissoes', 
        title: 'Comissões por Profissional', 
        description: 'Detalhamento de ganhos e taxas de repasse da equipe.', 
        icon: Wallet, 
        color: 'text-orange-600', 
        bg: 'bg-orange-50', 
        table: 'financial_transactions', // Filtramos no handleSelectReport
        columns: [
            { header: 'Data', key: 'date', format: (v) => format(parseISO(v), 'dd/MM/yyyy') },
            { header: 'Profissional', key: 'professional_name' },
            { header: 'Serviço/Produto', key: 'description' },
            { header: 'Base Cálculo', key: 'net_value', format: (v) => `R$ ${Number(v).toFixed(2)}` },
            { header: 'Taxa (%)', key: 'tax_rate', format: (v) => `${v || 0}%` },
            { header: 'Comissão (R$)', key: 'amount', format: (v) => `Calculado` } // Exemplo simplificado
        ]
    },
    { 
        id: 'agendamentos', 
        title: 'Histórico de Atendimentos', 
        description: 'Lista de serviços prestados, status e origem das reservas.', 
        icon: Calendar, 
        color: 'text-blue-600', 
        bg: 'bg-blue-50', 
        table: 'appointments',
        columns: [
            { header: 'Horário', key: 'date', format: (v) => format(parseISO(v), 'dd/MM/yyyy HH:mm') },
            { header: 'Cliente', key: 'client_name' },
            { header: 'Serviço', key: 'service_name' },
            { header: 'Profissional', key: 'professional_name' },
            { header: 'Status', key: 'status' },
            { header: 'Valor', key: 'value', format: (v) => `R$ ${Number(v).toFixed(2)}` }
        ]
    },
    { 
        id: 'clientes', 
        title: 'Base Geral de Clientes', 
        description: 'Mailing completo com contatos, tags e datas de nascimento.', 
        icon: Users, 
        color: 'text-purple-600', 
        bg: 'bg-purple-50', 
        table: 'clients',
        columns: [
            { header: 'Nome', key: 'nome' },
            { header: 'WhatsApp', key: 'whatsapp' },
            { header: 'E-mail', key: 'email' },
            { header: 'Cidade', key: 'cidade' },
            { header: 'Nascimento', key: 'birth_date', format: (v) => v ? format(parseISO(v), 'dd/MM/yyyy') : '---' }
        ]
    }
];

const RelatoriosView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Navegação de Data
    const handlePrevMonth = () => {
        setCurrentDate(prev => addMonths(prev, -1));
        if (selectedReport) setSelectedReport(null);
    };
    const handleNextMonth = () => {
        setCurrentDate(prev => addMonths(prev, 1));
        if (selectedReport) setSelectedReport(null);
    };

    // --- KPIs ABA 1: VISÃO GERAL ---
    const stats = useMemo(() => {
        const income = mockTransactions
            .filter(t => t.type === 'receita' && isSameMonth(new Date(t.date), currentDate))
            .reduce((sum, t) => sum + t.amount, 0);
            
        const expense = mockTransactions
            .filter(t => t.type === 'despesa' && isSameMonth(new Date(t.date), currentDate))
            .reduce((sum, t) => sum + t.amount, 0);
            
        const count = initialAppointments.filter(a => isSameMonth(new Date(a.start), currentDate)).length;
        
        return { income, expense, profit: income - expense, count };
    }, [currentDate]);

    // --- MOTOR DE DADOS: CENTRAL DE EXPORTAÇÃO ---
    const handleSelectReport = async (report: ReportDefinition) => {
        setIsLoading(true);
        setSelectedReport(report);
        setPreviewData([]);
        
        try {
            const start = startOfMonth(currentDate).toISOString();
            const end = endOfMonth(currentDate).toISOString();

            let query = supabase.from(report.table).select('*');

            // Filtros específicos por tipo de relatório
            if (report.table === 'clients') {
                query = query.order('nome');
            } else if (report.id === 'comissoes') {
                query = query.not('professional_id', 'is', null).gte('date', start).lte('date', end).order('date');
            } else {
                query = query.gte('date', start).lte('date', end).order('date');
            }

            const { data, error } = await query;
            if (error) throw error;
            setPreviewData(data || []);
        } catch (e: any) {
            console.error("Relatórios Error:", e.message);
            setPreviewData([]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- MOTORES DE EXPORTAÇÃO (Excel & PDF) ---

    const exportToExcel = () => {
        if (!previewData.length || !selectedReport) return;
        setIsExporting(true);
        
        try {
            // Formata os dados baseado nas definições de colunas para o Excel
            const exportRows = previewData.map(row => {
                const entry: any = {};
                selectedReport.columns.forEach(col => {
                    const rawValue = row[col.key];
                    entry[col.header] = col.format ? col.format(rawValue) : rawValue;
                });
                return entry;
            });

            const worksheet = XLSX.utils.json_to_sheet(exportRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
            
            const fileName = `Relatorio_${selectedReport.id}_${format(currentDate, 'MM_yyyy')}.xlsx`;
            XLSX.writeFile(workbook, fileName);
        } finally {
            setIsExporting(false);
        }
    };

    const exportToPDF = () => {
        if (!previewData.length || !selectedReport) return;
        setIsExporting(true);

        try {
            const doc = new jsPDF('landscape');
            const pageWidth = doc.internal.pageSize.getWidth();
            
            // Estilização do PDF
            doc.setFontSize(18);
            doc.setTextColor(30, 41, 59); // Slate-800
            doc.text("BELARESTUDIO - GESTÃO INTELIGENTE", 14, 15);
            
            doc.setFontSize(12);
            doc.setTextColor(249, 115, 22); // Orange-500
            doc.text(selectedReport.title.toUpperCase(), 14, 22);
            
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184); // Slate-400
            const subtitle = `Competência: ${format(currentDate, 'MMMM yyyy', { locale: pt })} | Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
            doc.text(subtitle, 14, 28);

            // Mapeamento de colunas para o autoTable
            const headers = [selectedReport.columns.map(c => c.header)];
            const body = previewData.map(row => 
                selectedReport.columns.map(col => {
                    const val = row[col.key];
                    return col.format ? col.format(val) : String(val ?? '');
                })
            );

            autoTable(doc, {
                startY: 35,
                head: headers,
                body: body,
                theme: 'striped',
                headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 3 },
                alternateRowStyles: { fillColor: [250, 250, 250] },
                margin: { left: 14, right: 14 }
            });

            const fileName = `Report_${selectedReport.id}_${format(currentDate, 'MM_yyyy')}.pdf`;
            doc.save(fileName);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans text-left">
            {/* Header com Navegação e Abas */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col lg:flex-row justify-between items-center gap-4 flex-shrink-0 z-30 shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
                        <BarChart3 className="text-orange-500" size={28} />
                        Inteligência & Relatórios
                    </h1>
                    
                    {/* Seletor de Período */}
                    <div className="flex items-center bg-slate-100 rounded-xl border border-slate-200 p-1">
                        <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white rounded-lg text-slate-400 transition-all"><ChevronLeft size={18}/></button>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest min-w-[140px] text-center px-4">
                            {format(currentDate, 'MMMM yyyy', { locale: pt })}
                        </span>
                        <button onClick={handleNextMonth} className="p-1.5 hover:bg-white rounded-lg text-slate-400 transition-all"><ChevronRight size={18}/></button>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    <button 
                        onClick={() => { setActiveTab('overview'); setSelectedReport(null); }}
                        className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all ${activeTab === 'overview' ? 'bg-white shadow-md text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <FilePieChart size={14} /> Visão Geral
                    </button>
                    <button 
                        onClick={() => setActiveTab('export')}
                        className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all ${activeTab === 'export' ? 'bg-white shadow-md text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Table size={14} /> Central de Exportação
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8 pb-20">
                    
                    {/* --- ABA 1: DASHBOARD VISUAL --- */}
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* KPIs */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="p-5 border-l-4 border-l-emerald-500 rounded-2xl shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Faturamento Bruto</p>
                                    <h3 className="text-xl font-black text-slate-800">R$ {stats.income.toLocaleString('pt-BR')}</h3>
                                </Card>
                                <Card className="p-5 border-l-4 border-l-rose-500 rounded-2xl shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custos Totais</p>
                                    <h3 className="text-xl font-black text-slate-800">R$ {stats.expense.toLocaleString('pt-BR')}</h3>
                                </Card>
                                <Card className="p-5 border-l-4 border-l-blue-500 rounded-2xl shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resultado Líquido</p>
                                    <h3 className="text-xl font-black text-slate-800">R$ {stats.profit.toLocaleString('pt-BR')}</h3>
                                </Card>
                                <Card className="p-5 border-l-4 border-l-purple-500 rounded-2xl shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Atendimentos</p>
                                    <h3 className="text-xl font-black text-slate-800">{stats.count} sessões</h3>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <Card title="Receita por Categoria" className="rounded-[32px] shadow-sm">
                                    <div className="h-72 mt-4">
                                        <SafePie 
                                            data={[
                                                { name: 'Cílios', receita: 4500 },
                                                { name: 'Sobrancelhas', receita: 3200 },
                                                { name: 'Estética', receita: 1800 },
                                                { name: 'Produtos', receita: 950 }
                                            ]}
                                            colors={['#f97316', '#3b82f6', '#8b5cf6', '#10b981']}
                                        />
                                    </div>
                                </Card>
                                <Card title="Ranking de Produtividade" className="rounded-[32px] shadow-sm">
                                    <div className="h-72 mt-4">
                                        <SafeBar 
                                            data={professionals.map(p => ({
                                                name: p.name.split(' ')[0],
                                                minutosOcupados: 480,
                                                ocupacao: Math.floor(Math.random() * 40) + 50
                                            }))}
                                            color="#f97316"
                                        />
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* --- ABA 2: CENTRAL DE EXPORTAÇÃO (Estilo Salão99) --- */}
                    {activeTab === 'export' && !selectedReport && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Selecione o tipo de relatório contábil</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {reportsRegistry.map((report) => (
                                    <button
                                        key={report.id}
                                        onClick={() => handleSelectReport(report)}
                                        className="bg-white p-6 rounded-[32px] border-2 border-slate-100 hover:border-orange-500 hover:shadow-2xl transition-all text-left group active:scale-95 flex flex-col h-full"
                                    >
                                        <div className={`w-14 h-14 rounded-2xl ${report.bg} ${report.color} flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform`}>
                                            <report.icon size={28} />
                                        </div>
                                        <h3 className="font-black text-slate-800 text-lg leading-tight mb-2 group-hover:text-orange-600 transition-colors">
                                            {report.title}
                                        </h3>
                                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-8 flex-1">
                                            {report.description}
                                        </p>
                                        <div className="mt-auto flex items-center justify-between text-orange-500 font-black text-[10px] uppercase tracking-widest">
                                            Visualizar Dados <ArrowRight size={16} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- VIEW: PRÉVIA E EXPORTAÇÃO --- */}
                    {selectedReport && (
                        <div className="space-y-6 animate-in zoom-in-95 duration-300">
                            {/* Cabeçalho da Prévia */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setSelectedReport(null)}
                                        className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all"
                                        title="Voltar"
                                    >
                                        <ChevronLeft size={20} strokeWidth={3} />
                                    </button>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase">{selectedReport.title}</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{previewData.length} registros sincronizados</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button 
                                        onClick={exportToExcel}
                                        disabled={isExporting || previewData.length === 0}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileSpreadsheet size={18} />} Excel
                                    </button>
                                    <button 
                                        onClick={exportToPDF}
                                        disabled={isExporting || previewData.length === 0}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-900 shadow-lg shadow-slate-200 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileText size={18} />} Gerar PDF
                                    </button>
                                </div>
                            </div>

                            {/* Tabela de Preview */}
                            <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden min-h-[400px]">
                                {isLoading ? (
                                    <div className="py-32 flex flex-col items-center justify-center text-slate-400">
                                        <Loader2 className="animate-spin text-orange-500 mb-4" size={48} strokeWidth={3} />
                                        <p className="font-black uppercase tracking-widest text-[10px]">Lendo base de dados...</p>
                                    </div>
                                ) : previewData.length === 0 ? (
                                    <div className="py-32 text-center">
                                        <AlertTriangle size={64} className="text-slate-100 mx-auto mb-4" />
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Sem dados para este filtro.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 bg-slate-900 text-white z-20">
                                                <tr>
                                                    {selectedReport.columns.map(col => (
                                                        <th key={col.key} className="px-6 py-5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                                            {col.header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {previewData.map((row, i) => (
                                                    <tr key={i} className="hover:bg-orange-50/20 transition-colors">
                                                        {selectedReport.columns.map(col => {
                                                            const rawVal = row[col.key];
                                                            return (
                                                                <td key={col.key} className="px-6 py-4 text-xs font-bold text-slate-600 whitespace-nowrap">
                                                                    {col.format ? col.format(rawVal) : String(rawVal ?? '---')}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default RelatoriosView;
