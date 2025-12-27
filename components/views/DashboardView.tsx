
import React, { useMemo, useState, useEffect } from 'react';
import Card from '../shared/Card';
import JaciBotAssistant from '../shared/JaciBotAssistant';
import TodayScheduleWidget from '../dashboard/TodayScheduleWidget';
import WeeklyChart from '../charts/WeeklyChart';
import { getDashboardInsight } from '../../services/geminiService';
import { 
    DollarSign, Calendar, Users, TrendingUp, PlusCircle, UserPlus, ShoppingBag, 
    Clock, Globe, Edit3, Loader2, BarChart3, X, ArrowUpRight, ArrowDownRight,
    CheckCircle2, PlayCircle, CalendarCheck, Receipt, User as UserIcon
} from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR as pt } from 'date-fns/locale/pt-BR';
import { ViewState } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface DashboardData {
    today_revenue: number;
    month_revenue: number;
    today_scheduled: number;
    today_completed: number;
    monthly_goal: number;
    week_chart_data: { day: string; count: number }[];
}

type DetailModalType = 'revenue' | 'scheduled' | 'in_progress' | 'finished' | null;

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 2
    }).format(value);
};

const StatCard = ({ title, value, icon: Icon, colorClass, subtext, onClick }: any) => (
    <button 
        onClick={onClick}
        className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between hover:shadow-xl hover:border-orange-200 transition-all text-left active:scale-[0.98] group"
    >
        <div className="min-w-0">
            <p className="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-wider truncate group-hover:text-orange-500 transition-colors">{title}</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 mt-1 truncate">{value}</h3>
            {subtext && <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{subtext}</p>}
        </div>
        <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 transition-transform group-hover:rotate-12 ${colorClass}`}>
            <Icon className="w-5 h-5 text-white" />
        </div>
    </button>
);

const QuickAction = ({ icon: Icon, label, color, onClick }: any) => (
    <button 
        onClick={onClick}
        className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border border-slate-100 bg-white hover:border-orange-200 hover:bg-orange-50 transition-all group active:scale-95"
    >
        <div className={`p-3 rounded-full mb-2 transition-colors group-hover:bg-white ${color} shadow-sm`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:text-orange-50" />
        </div>
        <span className="text-[10px] sm:text-xs font-black text-slate-600 uppercase tracking-tighter group-hover:text-orange-700">{label}</span>
    </button>
);

const DetailModal = ({ type, onClose }: { type: DetailModalType, onClose: () => void }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const titles = {
        revenue: "Detalhamento de Receitas (Hoje)",
        scheduled: "Agenda Futura (Hoje)",
        in_progress: "Atendimentos em Andamento",
        finished: "Serviços Finalizados (Hoje)"
    };

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];
            try {
                if (type === 'revenue') {
                    const { data } = await supabase.from('appointments')
                        .select('client_name, service_name, value, status, date')
                        .gte('date', today)
                        .lte('date', today + 'T23:59:59')
                        .neq('status', 'cancelado')
                        .order('date');
                    setData(data || []);
                } else if (type === 'scheduled') {
                    const { data } = await supabase.from('appointments')
                        .select('client_name, service_name, professional_name, status, date')
                        .gte('date', new Date().toISOString()) // Apenas futuros
                        .lte('date', today + 'T23:59:59')
                        .eq('status', 'agendado')
                        .order('date');
                    setData(data || []);
                } else if (type === 'in_progress') {
                    const { data } = await supabase.from('appointments')
                        .select('client_name, service_name, professional_name, status, date')
                        .eq('status', 'em_atendimento')
                        .order('date');
                    setData(data || []);
                } else if (type === 'finished') {
                    const { data } = await supabase.from('appointments')
                        .select('client_name, service_name, professional_name, status, date, value')
                        .gte('date', today)
                        .lte('date', today + 'T23:59:59')
                        .eq('status', 'concluido')
                        .order('date', { ascending: false });
                    setData(data || []);
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (type) fetchDetails();
    }, [type]);

    if (!type) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                            {type === 'revenue' && <DollarSign className="text-green-500" />}
                            {type === 'scheduled' && <Calendar className="text-blue-500" />}
                            {type === 'in_progress' && <PlayCircle className="text-indigo-500" />}
                            {type === 'finished' && <CheckCircle2 className="text-purple-500" />}
                            {titles[type]}
                        </h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Visualização de foco BelaFlow</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={24}/></button>
                </header>

                <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="animate-spin mb-4 text-orange-500" size={40} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando dados...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300 italic">
                            <Receipt size={64} className="mb-4 opacity-20" />
                            <p>Nenhum registro encontrado para esta categoria no momento.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Horário</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Serviço</th>
                                        {(type === 'revenue' || type === 'finished') && (
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                                        )}
                                        {type !== 'revenue' && (
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Profissional</th>
                                        )}
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {data.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-mono font-bold text-slate-500">{format(parseISO(item.date), 'HH:mm')}</td>
                                            <td className="px-6 py-4 font-bold text-slate-700">{item.client_name}</td>
                                            <td className="px-6 py-4 text-slate-600">{item.service_name}</td>
                                            {(type === 'revenue' || type === 'finished') && (
                                                <td className="px-6 py-4 text-right font-black text-slate-800">{formatCurrency(item.value)}</td>
                                            )}
                                            {type !== 'revenue' && (
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-[10px] text-orange-600 font-black">{item.professional_name?.charAt(0)}</div>
                                                        <span className="font-medium text-slate-600">{item.professional_name}</span>
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
                                                    item.status === 'concluido' ? 'bg-green-100 text-green-700' :
                                                    item.status === 'agendado' ? 'bg-blue-100 text-blue-700' :
                                                    item.status === 'em_atendimento' ? 'bg-indigo-100 text-indigo-700' :
                                                    'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

const DashboardView: React.FC<{onNavigate: (view: ViewState) => void}> = ({ onNavigate }) => {
    const today = new Date();
    const [dbData, setDbData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeDetailModal, setActiveDetailModal] = useState<DetailModalType>(null);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_dashboard_summary');
            if (error) throw error;
            if (data) {
                setDbData({
                    today_revenue: data.today_revenue || 0,
                    month_revenue: data.month_revenue || 0,
                    today_scheduled: data.today_scheduled || 0,
                    today_completed: data.today_completed || 0,
                    monthly_goal: data.monthly_goal || 0,
                    week_chart_data: data.week_chart_data || []
                });
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    useEffect(() => { fetchDashboardData(); }, []);

    const goalMetrics = useMemo(() => {
        const current = dbData?.month_revenue || 0;
        const target = dbData?.monthly_goal || 0;
        const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
        return { current, target, percent };
    }, [dbData]);

    const handleEditGoal = async () => {
        const currentGoal = dbData?.monthly_goal || 0;
        const input = prompt("Qual sua meta de faturamento mensal (R$)?", currentGoal.toString());
        if (input !== null && !isNaN(parseFloat(input))) {
            const newGoal = parseFloat(input);
            try {
                const { error } = await supabase.from('studio_settings').update({ monthly_revenue_goal: newGoal }).neq('id', 0);
                if (error) throw error;
                fetchDashboardData();
            } catch (e: any) { alert("Erro ao salvar meta: " + e.message); }
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
                <p className="text-xs font-black uppercase tracking-widest">Calculando indicadores...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 h-full overflow-y-auto bg-slate-50/50 custom-scrollbar font-sans text-left">
            {activeDetailModal && <DetailModal type={activeDetailModal} onClose={() => setActiveDetailModal(null)} />}

            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1">
                        <Calendar size={14} className="text-orange-500" />
                        <span className="capitalize">{format(today, "EEEE, dd 'de' MMMM", { locale: pt })}</span>
                    </div>
                    <h1 className="text-xl sm:text-3xl font-black text-slate-800 leading-tight">
                        Olá, <span className="text-orange-500">Jacilene!</span>
                    </h1>
                </div>
                <button onClick={() => onNavigate('agenda')} className="px-4 py-2.5 bg-orange-500 text-white font-black rounded-xl hover:bg-orange-600 transition shadow-lg shadow-orange-100 flex items-center gap-2 text-sm active:scale-95">
                    <PlusCircle size={18} /> Novo Agendamento
                </button>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
                <StatCard 
                    title="Faturamento Hoje" 
                    value={formatCurrency(dbData?.today_revenue || 0)} 
                    icon={DollarSign} 
                    colorClass="bg-green-500 shadow-green-100" 
                    subtext="Clique para ver extrato"
                    onClick={() => setActiveDetailModal('revenue')}
                />
                <StatCard 
                    title="Agendados" 
                    value={dbData?.today_scheduled || 0} 
                    icon={Calendar} 
                    colorClass="bg-blue-500 shadow-blue-100" 
                    subtext="Ver lista de horários"
                    onClick={() => setActiveDetailModal('scheduled')}
                />
                <StatCard 
                    title="No Salão" 
                    value={dbData?.today_completed > 0 ? "Ativo" : "---"} 
                    icon={PlayCircle} 
                    colorClass="bg-indigo-500 shadow-indigo-100" 
                    subtext="Atendimentos agora"
                    onClick={() => setActiveDetailModal('in_progress')}
                />
                <StatCard 
                    title="Finalizados" 
                    value={dbData?.today_completed || 0} 
                    icon={Users} 
                    colorClass="bg-purple-500 shadow-purple-100" 
                    subtext="Ver serviços concluídos"
                    onClick={() => setActiveDetailModal('finished')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
                        <QuickAction icon={UserPlus} label="Cliente" color="bg-blue-500" onClick={() => onNavigate('clientes')} />
                        <QuickAction icon={Globe} label="Link" color="bg-purple-500" onClick={() => onNavigate('agenda_online')} />
                        <QuickAction icon={ShoppingBag} label="Venda" color="bg-green-500" onClick={() => onNavigate('vendas')} />
                        <QuickAction icon={TrendingUp} label="Caixa" color="bg-slate-700" onClick={() => onNavigate('financeiro')} />
                        <QuickAction icon={Clock} label="Agenda" color="bg-orange-500" onClick={() => onNavigate('agenda')} />
                    </div>

                    <JaciBotAssistant fetchInsight={getDashboardInsight} />
                    
                    <Card title="Desempenho Semanal" icon={<BarChart3 size={18} className="text-orange-500" />}>
                        <div className="mt-4">
                            <WeeklyChart data={dbData?.week_chart_data || []} />
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    <TodayScheduleWidget onNavigate={onNavigate} />
                </div>
            </div>

            {/* Meta Mensal Card - Reposicionado para destaque lateral se necessário, mantendo o original do usuário */}
            <div className="mt-6 bg-slate-800 p-6 rounded-[32px] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group max-w-md">
                <div className="flex justify-between items-start z-10">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Progresso Meta Mensal</p>
                    <button onClick={handleEditGoal} className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-opacity"><Edit3 size={12}/></button>
                </div>
                <div className="mt-2 z-10">
                    <div className="flex items-end justify-between mb-2">
                        <h3 className="text-3xl font-black">{goalMetrics.percent}%</h3>
                        <span className="text-[10px] font-bold opacity-60">alvo: {formatCurrency(goalMetrics.target)}</span>
                    </div>
                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-orange-500 transition-all duration-1000 shadow-[0_0_10px_rgba(249,115,22,0.5)]" style={{ width: `${goalMetrics.percent}%` }} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 tracking-tight">
                        Total acumulado: <span className="text-white">{formatCurrency(goalMetrics.current)}</span>
                    </p>
                </div>
                <TrendingUp className="absolute -right-4 -bottom-4 text-white opacity-[0.03]" size={120} strokeWidth={4} />
            </div>
        </div>
    );
};

export default DashboardView;
