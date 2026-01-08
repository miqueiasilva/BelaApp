
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
import { generateChurnRecoveryMessage } from '../../services/geminiService';

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
    const [aiGeneratingId, setAiGeneratingId] = useState<number | null>(null);
    
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    
    const [transactions, setTransactions] = useState<any[]>([]);
    const [prevTransactions, setPrevTransactions] = useState<any[]>([]);
    const [lifetimeTransactions, setLifetimeTransactions] = useState<any[]>([]);
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

            const [transRes, prevTransRes, apptsRes, prodsRes, clientsRes, ltvRes] = await Promise.all([
                supabase.from('financial_transactions').select('*').gte('date', currentStart.toISOString()).lte('date', currentEnd.toISOString()).neq('status', 'cancelado'),
                supabase.from('financial_transactions').select('*').gte('date', prevStart.toISOString()).lte('date', prevEnd.toISOString()).neq('status', 'cancelado'),
                supabase.from('appointments').select('*').gte('date', currentStart.toISOString()).lte('date', currentEnd.toISOString()),
                supabase.from('products').select('*'),
                supabase.from('clients').select('*'),
                supabase.from('financial_transactions').select('client_id, amount, type').eq('type', 'income').neq('status', 'cancelado')
            ]);

            setTransactions(transRes.data || []);
            setPrevTransactions(prevTransRes.data || []);
            setAppointments(apptsRes.data || []);
            setProducts(prodsRes.data || []);
            setClients(clientsRes.data || []);
            setLifetimeTransactions(ltvRes.data || []);
        } catch (e) {
            console.error("Erro no motor de dados:", e);
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        if (isMounted) refreshAllData();
    }, [isMounted, refreshAllData]);

    const handleAIGenerateMessage = async (client: any) => {
        setAiGeneratingId(client.id);
        try {
            const msg = await generateChurnRecoveryMessage(client.nome, client.last_service || "procedimento");
            const whatsappUrl = `https://wa.me/55${client.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
            window.open(whatsappUrl, '_blank');
        } catch (e) {
            alert("Erro ao falar com a IA.");
        } finally {
            setAiGeneratingId(null);
        }
    };

    const bi = useMemo(() => {
        const income = transactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);
        const prevIncome = prevTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount || 0), 0);
        
        const concludedCount = appointments.filter(a => a.status === 'concluido').length;
        const avgTicket = concludedCount > 0 ? income / concludedCount : 0;

        const atRiskClients = clients.map(c => {
            const clientAppts = appointments.filter(a => a.client_id === c.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const lastAppt = clientAppts[0];
            const daysSince = lastAppt ? differenceInDays(new Date(), parseISO(lastAppt.date)) : 999;
            return { ...c, daysSince, last_service: lastAppt?.service_name };
        }).filter(c => c.daysSince > 45 && c.daysSince < 500).sort((a, b) => b.daysSince - a.daysSince).slice(0, 10);

        return {
            income, prevIncome, expense, avgTicket, atRiskClients,
            evolutionData: [] // Simplificado para exemplo
        };
    }, [transactions, prevTransactions, appointments, clients]);

    if (!isMounted) return null;

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans text-left">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><BarChart3 size={24} /></div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Inteligência CRM</h1>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto">
                    {['dashboard', 'financeiro', 'clientes'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === tab ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}>
                            {tab}
                        </button>
                    ))}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8 pb-20">
                    {isLoading ? (
                        <div className="py-32 flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
                            <p className="text-xs font-black uppercase tracking-[0.3em]">Analisando sua base...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <Card title="⚠️ Clientes em Risco (Churn)" icon={<AlertOctagon size={18} className="text-rose-500"/>}>
                                    <div className="space-y-3">
                                        {bi.atRiskClients.map((c, i) => (
                                            <div key={i} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400">{c.nome.charAt(0)}</div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700">{c.nome}</p>
                                                        <p className="text-[10px] font-black text-rose-500 uppercase">Sem visita há {c.daysSince} dias</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleAIGenerateMessage(c)}
                                                    disabled={aiGeneratingId === c.id}
                                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {aiGeneratingId === c.id ? <Loader2 size={14} className="animate-spin"/> : <Zap size={14}/>}
                                                    Recuperar com IA
                                                </button>
                                            </div>
                                        ))}
                                        {bi.atRiskClients.length === 0 && <p className="text-center py-10 text-slate-400 italic">Sua retenção está excelente!</p>}
                                    </div>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <MetricCard title="Ticket Médio" value={`R$ ${bi.avgTicket.toFixed(2)}`} color="bg-orange-500" icon={TrendingUp} />
                                <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                                    <Sparkles className="absolute -right-4 -top-4 opacity-20" size={120} />
                                    <h4 className="text-xs font-black uppercase tracking-widest text-indigo-200 mb-4">JaciBot Insight</h4>
                                    <p className="text-sm font-medium leading-relaxed italic opacity-90">
                                        "Você tem {bi.atRiskClients.length} clientes em risco. Use a IA para enviar convites personalizados e recupere até 15% do seu faturamento."
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
