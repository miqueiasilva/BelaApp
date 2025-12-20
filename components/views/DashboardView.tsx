
import React, { useState, useEffect, useCallback } from 'react';
import { 
    DollarSign, Calendar, Users, TrendingUp, PlusCircle, UserPlus, 
    ShoppingBag, ArrowRight, Loader2, AlertTriangle, RefreshCw 
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '../../services/supabaseClient';
import Card from '../shared/Card';
import JaciBotAssistant from '../shared/JaciBotAssistant';
import { getDashboardInsight } from '../../services/geminiService';
import { ViewState } from '../../types';

interface DashboardViewProps {
    onNavigate: (view: ViewState) => void;
}

const StatCard = ({ title, value, icon: Icon, colorClass, loading }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow h-full">
        <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
            {loading ? (
                <div className="h-8 w-24 bg-slate-100 animate-pulse rounded mt-1"></div>
            ) : (
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
            )}
        </div>
        <div className={`p-3 rounded-xl ${colorClass}`}>
            <Icon className="w-5 h-5 text-white" />
        </div>
    </div>
);

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        revenueToday: 0,
        appointmentsCount: 0,
        pendingOrders: 0
    });
    const [upcomingApps, setUpcomingApps] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const today = new Date();
            const tStart = startOfDay(today).toISOString();
            const tEnd = endOfDay(today).toISOString();

            // 1. Faturamento Hoje (Transações de Receita)
            const { data: revData, error: revErr } = await supabase
                .from('financial_transactions')
                .select('amount')
                .eq('type', 'receita')
                .gte('date', tStart)
                .lte('date', tEnd);
            if (revErr) throw revErr;

            // 2. Agendamentos Hoje (Count)
            const { count: appCount, error: appErr } = await supabase
                .from('appointments')
                .select('*', { count: 'exact', head: true })
                .gte('date', tStart)
                .lte('date', tEnd)
                .neq('status', 'cancelado');
            if (appErr) throw appErr;

            // 3. Próximos Clientes
            const { data: upcoming, error: upErr } = await supabase
                .from('appointments')
                .select('id, client_name, service_name, date')
                .gte('date', today.toISOString())
                .lte('date', tEnd)
                .order('date', { ascending: true })
                .limit(5);
            if (upErr) throw upErr;

            setStats({
                revenueToday: revData?.reduce((acc, curr) => acc + curr.amount, 0) || 0,
                appointmentsCount: appCount || 0,
                pendingOrders: 0 // Espaço para expansão futura
            });
            setUpcomingApps(upcoming || []);

        } catch (error: any) {
            alert("Erro ao carregar Dashboard: " + error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-50/50 font-sans">
            <header className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="capitalize">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: pt })}</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                        Painel <span className="text-orange-500">Resumo</span>
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchData} className="p-2.5 text-slate-400 hover:text-orange-500 transition-colors bg-white rounded-xl border border-slate-100 shadow-sm"><RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} /></button>
                    <button onClick={() => onNavigate('agenda')} className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition shadow-lg shadow-orange-200 flex items-center gap-2">
                        <PlusCircle size={18} /> Novo Agendamento
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Faturamento Hoje" value={`R$ ${stats.revenueToday.toFixed(2)}`} icon={DollarSign} colorClass="bg-green-500" loading={isLoading} />
                <StatCard title="Atendimentos Hoje" value={stats.appointmentsCount} icon={Users} colorClass="bg-blue-500" loading={isLoading} />
                <StatCard title="Meta do Mês" value="85%" icon={TrendingUp} colorClass="bg-slate-800" loading={isLoading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Shortcuts */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <button onClick={() => onNavigate('vendas')} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-orange-200 hover:shadow-md transition-all flex flex-col items-center gap-2 group">
                            <div className="p-3 bg-orange-50 text-orange-500 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors"><ShoppingBag size={24} /></div>
                            <span className="text-xs font-bold text-slate-600">Nova Venda</span>
                        </button>
                        <button onClick={() => onNavigate('clientes')} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all flex flex-col items-center gap-2 group">
                            <div className="p-3 bg-blue-50 text-blue-500 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors"><UserPlus size={24} /></div>
                            <span className="text-xs font-bold text-slate-600">Novo Cliente</span>
                        </button>
                        <button onClick={() => onNavigate('financeiro')} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-green-200 hover:shadow-md transition-all flex flex-col items-center gap-2 group">
                            <div className="p-3 bg-green-50 text-green-500 rounded-xl group-hover:bg-green-500 group-hover:text-white transition-colors"><DollarSign size={24} /></div>
                            <span className="text-xs font-bold text-slate-600">Lançar Caixa</span>
                        </button>
                        <button onClick={() => onNavigate('agenda')} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-purple-200 hover:shadow-md transition-all flex flex-col items-center gap-2 group">
                            <div className="p-3 bg-purple-50 text-purple-500 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-colors"><Calendar size={24} /></div>
                            <span className="text-xs font-bold text-slate-600">Ver Agenda</span>
                        </button>
                    </div>

                    <JaciBotAssistant fetchInsight={getDashboardInsight} />
                </div>

                <div className="space-y-6">
                    <Card title="Próximos Clientes">
                        {upcomingApps.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 italic text-sm">Nenhum agendamento para o restante do dia.</div>
                        ) : (
                            <div className="space-y-4">
                                {upcomingApps.map((app) => (
                                    <div key={app.id} className="flex gap-4 items-center p-3 hover:bg-slate-50 rounded-xl transition-colors">
                                        <div className="w-12 h-12 bg-white border border-slate-100 shadow-sm rounded-lg flex flex-col items-center justify-center">
                                            <span className="text-xs font-black text-slate-800">{format(new Date(app.date), 'HH:mm')}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{app.client_name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{app.service_name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={() => onNavigate('agenda')} className="w-full mt-4 py-2 text-xs font-black text-orange-500 hover:underline uppercase tracking-widest flex items-center justify-center gap-2">
                            Ver agenda completa <ArrowRight size={14}/>
                        </button>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
