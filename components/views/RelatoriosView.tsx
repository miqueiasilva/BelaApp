import React, { useState, useMemo } from 'react';
import { 
    BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, 
    Users, ChevronLeft, ChevronRight, Download, Filter, PieChart 
} from 'lucide-react';
import { format, subMonths, addMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Card from '../shared/Card';
import SafePie from '../charts/SafePie';
import SafeBar from '../charts/SafeBar';
import { mockTransactions, initialAppointments, professionals } from '../../data/mockData';
import { safe, toNumber } from '../../utils/normalize';

const RelatoriosView: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());

    // --- Actions ---
    const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

    // --- Data Processing ---

    // 1. Filter Transactions for Financial KPIs
    const monthTransactions = useMemo(() => {
        return mockTransactions.filter(t => isSameMonth(new Date(t.date), currentDate));
    }, [currentDate]);

    const financialStats = useMemo(() => {
        const income = monthTransactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + t.amount, 0);
        const expense = monthTransactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + t.amount, 0);
        const profit = income - expense;
        const margin = income > 0 ? (profit / income) * 100 : 0;
        return { income, expense, profit, margin };
    }, [monthTransactions]);

    // 2. Filter Appointments for Operational KPIs & Charts
    const monthAppointments = useMemo(() => {
        return initialAppointments.filter(a => 
            isSameMonth(new Date(a.start), currentDate) && 
            a.status === 'concluido'
        );
    }, [currentDate]);

    const operationalStats = useMemo(() => {
        const count = monthAppointments.length;
        // Calculate revenue from appointments to cross-check or use as specific service revenue
        const serviceRevenue = monthAppointments.reduce((sum, a) => sum + a.service.price, 0);
        const avgTicket = count > 0 ? serviceRevenue / count : 0;
        
        return { count, avgTicket, serviceRevenue };
    }, [monthAppointments]);

    // 3. Chart Data: Revenue by Service Category (Simulated by Service Name for now)
    const servicePieData = useMemo(() => {
        const data: Record<string, number> = {};
        monthAppointments.forEach(app => {
            const name = app.service.name;
            data[name] = (data[name] || 0) + app.service.price;
        });

        return Object.entries(data)
            .map(([name, value]) => ({ name, receita: value }))
            .sort((a, b) => b.receita - a.receita)
            .slice(0, 5); // Top 5 services
    }, [monthAppointments]);

    // 4. Chart Data: Professional Performance
    const professionalRanking = useMemo(() => {
        return professionals.map(prof => {
            const profApps = monthAppointments.filter(a => a.professional.id === prof.id);
            const revenue = profApps.reduce((sum, a) => sum + a.service.price, 0);
            return {
                id: prof.id,
                name: prof.name,
                avatar: prof.avatarUrl,
                revenue,
                count: profApps.length,
                ocupacao: Math.min(100, (profApps.length / 20) * 100), // Mock occupancy
                minutosOcupados: profApps.reduce((acc, curr) => acc + curr.service.duration, 0)
            };
        }).sort((a, b) => b.revenue - a.revenue);
    }, [monthAppointments]);

    const maxProfRevenue = Math.max(...professionalRanking.map(p => p.revenue), 1);

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 className="text-orange-500" />
                        Relatórios Gerenciais
                    </h1>
                    <p className="text-slate-500 text-sm">Análise detalhada do desempenho do seu estúdio.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-md text-slate-600 transition shadow-sm">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="px-4 font-bold text-slate-700 w-40 text-center capitalize">
                            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                        </div>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-md text-slate-600 transition shadow-sm">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition">
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Exportar PDF</span>
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Financial KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Receita Total</p>
                            <div className="p-2 bg-green-100 rounded-full text-green-600">
                                <DollarSign className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {financialStats.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </h3>
                            <p className="text-xs text-green-600 flex items-center gap-1 font-medium mt-1">
                                <TrendingUp className="w-3 h-3" />
                                +12% vs. mês anterior
                            </p>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Despesas</p>
                            <div className="p-2 bg-red-100 rounded-full text-red-600">
                                <TrendingDown className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {financialStats.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                                Custos operacionais e fixos
                            </p>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Lucro Líquido</p>
                            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                                <DollarSign className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <h3 className={`text-2xl font-bold ${financialStats.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {financialStats.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                Margem de {financialStats.margin.toFixed(1)}%
                            </p>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Ticket Médio</p>
                            <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                                <Users className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {operationalStats.avgTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {operationalStats.count} atendimentos realizados
                            </p>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Services Chart */}
                    <Card title="Receita por Serviço (Top 5)">
                        <div className="h-64 flex items-center justify-center">
                            {servicePieData.length > 0 ? (
                                <SafePie 
                                    data={servicePieData}
                                    colors={['#f97316', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6']}
                                />
                            ) : (
                                <p className="text-slate-400 text-sm">Sem dados de serviços neste mês.</p>
                            )}
                        </div>
                    </Card>

                    {/* Professional Performance */}
                    <Card title="Desempenho da Equipe (Receita)">
                        <div className="space-y-4 h-64 overflow-y-auto pr-2 scrollbar-thin">
                            {professionalRanking.map((prof) => (
                                <div key={prof.id} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <img src={prof.avatar} alt={prof.name} className="w-5 h-5 rounded-full" />
                                            <span className="font-semibold text-slate-700">{prof.name}</span>
                                        </div>
                                        <span className="text-slate-600 font-bold">
                                            {prof.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className="bg-orange-500 h-full rounded-full transition-all duration-500" 
                                            style={{ width: `${(prof.revenue / maxProfRevenue) * 100}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-right">{prof.count} atendimentos</p>
                                </div>
                            ))}
                            {professionalRanking.length === 0 && (
                                <p className="text-center text-slate-400 text-sm pt-10">Nenhum atendimento registrado.</p>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Additional Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Produtividade da Equipe (%)">
                         <div className="h-64">
                            <SafeBar 
                                data={professionalRanking.map(p => ({
                                    name: p.name.split(' ')[0],
                                    ocupacao: p.ocupacao,
                                    minutosOcupados: p.minutosOcupados
                                }))}
                                color="#8b5cf6"
                            />
                         </div>
                    </Card>

                    {/* Summary Table */}
                    <Card title="Resumo Operacional">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2">Métrica</th>
                                        <th className="px-4 py-2 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr>
                                        <td className="px-4 py-2 font-medium text-slate-700">Total Agendamentos</td>
                                        <td className="px-4 py-2 text-right text-slate-600">{operationalStats.count}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-2 font-medium text-slate-700">Serviço Mais Vendido</td>
                                        <td className="px-4 py-2 text-right text-slate-600">{servicePieData[0]?.name || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-2 font-medium text-slate-700">Profissional Top 1</td>
                                        <td className="px-4 py-2 text-right text-slate-600">{professionalRanking[0]?.name || '-'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Insight Banner */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center gap-4">
                    <div className="p-3 bg-white rounded-full text-indigo-600 shadow-sm">
                        <Filter className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-indigo-900">Análise de Crescimento</h4>
                        <p className="text-sm text-indigo-700">
                            Seu faturamento cresceu em serviços de "Estética" comparado ao mês passado. 
                            Considere criar combos promocionais para aumentar ainda mais o ticket médio.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default RelatoriosView;