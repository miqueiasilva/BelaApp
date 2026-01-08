
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
    BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, 
    ChevronLeft, ChevronRight, FileSpreadsheet, FileText,
    Users, Scissors, Wallet, ArrowRight, Loader2, 
    AlertTriangle, FilePieChart, Table, CheckCircle2,
    BarChart, PieChart as PieChartIcon, Search, Printer, 
    Download, Filter, CalendarDays, Clock, CreditCard, Banknote, Smartphone,
    RefreshCw, Info, UserCheck, Zap, RotateCcw, MessageCircle, 
    Package, AlertOctagon, Layers, Coins, CheckSquare, Square,
    BarChart4, Tags, ShoppingBag, Sparkles, ArrowUpRight,
    ArrowUp, ArrowDown, PieChart, Receipt, Target, LayoutDashboard,
    HardDrive, History, Archive, Cake, Gauge, FileDown, Sheet
} from 'lucide-react';
import { 
    format, startOfMonth, endOfMonth, parseISO, 
    differenceInDays, subMonths, isSameDay, startOfDay, endOfDay,
    eachDayOfInterval, isWithinInterval, subDays, startOfYesterday, endOfYesterday
} from 'date-fns';
import { ptBR as pt } from 'date-fns/locale/pt-BR';
import { 
    ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, 
    CartesianGrid, Tooltip, Cell, PieChart as RechartsPieChart, Pie, AreaChart, Area
} from 'recharts';
import Card from '../shared/Card';
import { supabase } from '../../services/supabaseClient';

// Bibliotecas de Exportação
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const TrendBadge = ({ current, previous, label = "vs ant." }: { current: number, previous: number, label?: string }) => {
    const variation = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    const isUp = variation >= 0;
    if (previous === 0) return null;
    return (
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter border ${
            isUp ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
        }`}>
            {isUp ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
            {Math.abs(variation).toFixed(1)}% <span className="opacity-40 font-bold ml-0.5">{label}</span>
        </div>
    );
};

const MetricCard = ({ title, value, subtext, icon: Icon, color, trend }: any) => (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${color} text-white shadow-lg`}>
                <Icon size={20} />
            </div>
            {trend}
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 mt-1">{value}</h3>
        {subtext && <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase">{subtext}</p>}
    </div>
);

const RelatoriosView: React.FC = () => {
    const [isMounted, setIsMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const [isLoading, setIsLoading] = useState(false);
    const [isComparing, setIsComparing] = useState(false);
    
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    
    const [transactions, setTransactions] = useState<any[]>([]);
    const [prevTransactions, setPrevTransactions] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);

    useEffect(() => { setIsMounted(true); }, []);

    const refreshAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const currentStart = startOfDay(parseISO(startDate));
            const currentEnd = endOfDay(parseISO(endDate));
            const diffDays = differenceInDays(currentEnd, currentStart) + 1;
            const prevStart = subDays(currentStart, diffDays);
            const prevEnd = subDays(currentEnd, diffDays);

            const [transRes, prevTransRes, apptsRes, prodsRes, clientsRes] = await Promise.all([
                supabase.from('financial_transactions').select('*').gte('date', currentStart.toISOString()).lte('date', currentEnd.toISOString()).neq('status', 'cancelado'),
                supabase.from('financial_transactions').select('*').gte('date', prevStart.toISOString()).lte('date', prevEnd.toISOString()).neq('status', 'cancelado'),
                // FIX: Lendo da VIEW para evitar Erro 400 ao acessar colunas virtuais
                supabase.from('vw_agenda_completa').select('*').gte('date', currentStart.toISOString()).lte('date', currentEnd.toISOString()),
                supabase.from('products').select('*'),
                supabase.from('clients').select('*')
            ]);

            setTransactions(transRes.data || []);
            setPrevTransactions(prevTransRes.data || []);
            setAppointments(apptsRes.data || []);
            setProducts(prodsRes.data || []);
            setClients(clientsRes.data || []);
        } catch (e) {
            console.error("Relatorios BI Engine Error:", e);
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        if (isMounted) refreshAllData();
    }, [isMounted, refreshAllData]);

    const bi = useMemo(() => {
        const income = transactions.filter(t => t.type === 'income' || t.type === 'receita').reduce((acc, t) => acc + Number(t.amount || 0), 0);
        const prevIncome = prevTransactions.filter(t => t.type === 'income' || t.type === 'receita').reduce((acc, t) => acc + Number(t.amount || 0), 0);
        const expense = transactions.filter(t => t.type === 'expense' || t.type === 'despesa').reduce((acc, t) => acc + Number(t.amount || 0), 0);
        const prevExpense = prevTransactions.filter(t => t.type === 'expense' || t.type === 'despesa').reduce((acc, t) => acc + Number(t.amount || 0), 0);
        
        const concludedCount = appointments.filter(a => a.status === 'concluido').length;
        const avgTicket = concludedCount > 0 ? income / concludedCount : 0;
        const occupancy = appointments.length > 0 ? (concludedCount / appointments.length) * 100 : 0;

        const criticalStock = products.filter(p => p.stock_quantity <= (p.min_stock || 5));

        const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
        const evolutionData = days.map(day => {
            const dStr = format(day, 'yyyy-MM-dd');
            const dayTrans = transactions.filter(t => format(parseISO(t.date), 'yyyy-MM-dd') === dStr);
            return {
                day: format(day, 'dd/MM'),
                receita: dayTrans.filter(t => t.type === 'income' || t.type === 'receita').reduce((acc, t) => acc + Number(t.amount || 0), 0),
                despesa: dayTrans.filter(t => t.type === 'expense' || t.type === 'despesa').reduce((acc, t) => acc + Number(t.amount || 0), 0)
            };
        });

        const categoryMap: Record<string, number> = {};
        appointments.forEach(a => {
            if (a.status === 'concluido') {
                const cat = a.service_category || 'Geral';
                categoryMap[cat] = (categoryMap[cat] || 0) + Number(a.value || 0);
            }
        });
        const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

        return {
            income, prevIncome, expense, prevExpense, avgTicket, occupancy,
            criticalStock, evolutionData, categoryData
        };
    }, [transactions, prevTransactions, appointments, products, startDate, endDate]);

    const generatePDF = (type: string) => {
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold");
        doc.text("BelareStudio - Relatório de Gestão", 14, 20);
        doc.setFontSize(10);
        doc.text(`Período: ${startDate} até ${endDate}`, 14, 28);

        autoTable(doc, {
            startY: 40,
            head: [['Indicador', 'Valor']],
            body: [
                ['Faturamento Realizado', formatBRL(bi.income)],
                ['Total Despesas', formatBRL(bi.expense)],
                ['Saldo Líquido', formatBRL(bi.income - bi.expense)],
                ['Ticket Médio', formatBRL(bi.avgTicket)],
                ['Ocupação de Agenda', `${bi.occupancy.toFixed(1)}%`]
            ],
            theme: 'striped'
        });

        doc.save(`Relatorio_${type}_${startDate}.pdf`);
    };

    const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (!isMounted) return null;

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans text-left">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><BarChart3 size={24} /></div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Inteligência Estratégica</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-hide max-w-full">
                        {[
                            { id: 'dashboard', label: 'Executivo', icon: LayoutDashboard },
                            { id: 'financeiro', label: 'Financeiro', icon: Wallet },
                            { id: 'performance', label: 'Ticket Médio', icon: Target },
                            { id: 'estoque', label: 'Estoque', icon: Package }
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)} 
                                className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <tab.icon size={12} /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${isComparing ? 'bg-indigo-500' : 'bg-slate-200'}`} onClick={() => setIsComparing(!isComparing)}>
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isComparing ? 'left-6' : 'left-1'}`} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comparar Anterior</span>
                        </label>
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-[10px] font-bold text-slate-600 outline-none px-2" />
                            <span className="text-slate-300 text-xs font-bold">até</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-[10px] font-bold text-slate-600 outline-none px-2" />
                        </div>
                        <button onClick={refreshAllData} className="p-2.5 bg-slate-800 text-white rounded-xl shadow-md active:scale-95"><RefreshCw size={16} className={isLoading ? 'animate-spin' : ''}/></button>
                    </div>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8 pb-20">
                    {isLoading ? (
                        <div className="py-32 flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
                            <p className="text-xs font-black uppercase tracking-[0.3em] animate-pulse">Sincronizando BI via View...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'dashboard' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
                                    <div className="space-y-6">
                                        <MetricCard 
                                            title="Receita Realizada" 
                                            value={formatBRL(bi.income)}
                                            subtext="Confirmadas na View"
                                            color="bg-emerald-500"
                                            icon={DollarSign}
                                            trend={isComparing && <TrendBadge current={bi.income} previous={bi.prevIncome} />}
                                        />
                                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ocupação Média</p>
                                            <div className="relative w-32 h-16 overflow-hidden">
                                                <div className="absolute top-0 w-32 h-32 rounded-full border-[12px] border-slate-100"></div>
                                                <div className="absolute top-0 w-32 h-32 rounded-full border-[12px] border-indigo-500 transition-all duration-1000" style={{ clipPath: `polygon(0 0, 100% 0, 100% 50%, 0 50%)`, transform: `rotate(${(bi.occupancy * 1.8) - 180}deg)` }}></div>
                                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 font-black text-xl text-slate-800">{bi.occupancy.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <MetricCard 
                                            title="Ticket Médio" 
                                            value={formatBRL(bi.avgTicket)}
                                            color="bg-orange-500"
                                            icon={TrendingUp}
                                        />
                                        <div className="p-6 bg-slate-900 rounded-[32px] text-white shadow-xl flex items-center justify-between">
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Lucro Operacional</p>
                                                <h3 className="text-2xl font-black mt-1">{formatBRL(bi.income - bi.expense)}</h3>
                                            </div>
                                            <div className="p-3 bg-white/10 rounded-2xl"><Banknote size={24} className="text-emerald-400" /></div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <Card title="Alertas de Estoque" icon={<Package size={16} className="text-rose-500"/>}>
                                            <div className="space-y-3">
                                                {bi.criticalStock.slice(0, 3).map((p, i) => (
                                                    <div key={i} className="flex justify-between items-center p-3 bg-rose-50/30 rounded-2xl border border-rose-100">
                                                        <span className="text-xs font-bold text-slate-700">{p.name}</span>
                                                        <span className="text-[10px] font-black text-rose-600 uppercase">{p.stock_quantity} un.</span>
                                                    </div>
                                                ))}
                                                {bi.criticalStock.length === 0 && <p className="text-center py-4 text-xs text-slate-300 italic">Estoque saudável</p>}
                                            </div>
                                        </Card>
                                        <button onClick={() => generatePDF('executivo')} className="w-full py-4 bg-slate-800 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
                                            <FileText size={16} /> Gerar PDF Geral
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'performance' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Card title="Receita por Categoria de Serviço" icon={<PieChartIcon size={18} className="text-indigo-500" />}>
                                        <div className="h-72">
                                            {bi.categoryData.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RechartsPieChart>
                                                        <Pie data={bi.categoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={5}>
                                                            {bi.categoryData.map((_, index) => (
                                                                <Cell key={`cell-${index}`} fill={['#6366F1', '#F97316', '#10B981', '#F43F5E', '#8B5CF6'][index % 5]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip />
                                                    </RechartsPieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-slate-300 italic text-xs">Sem dados no período</div>
                                            )}
                                        </div>
                                    </Card>

                                    <Card title="Fluxo de Caixa Diário" icon={<BarChart size={18} className="text-orange-500" />}>
                                        <div className="h-72">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsBarChart data={bi.evolutionData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                                                    <Tooltip cursor={{fill: '#f8fafc'}} />
                                                    <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                                                </RechartsBarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default RelatoriosView;