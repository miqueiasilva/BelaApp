
import React, { useState, useMemo } from 'react';
import { 
    BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, 
    Users, ChevronLeft, ChevronRight, Download, Filter, PieChart 
} from 'lucide-react';
import format from 'date-fns/format';
import subMonths from 'date-fns/subMonths';
import addMonths from 'date-fns/addMonths';
import isSameMonth from 'date-fns/isSameMonth';
import ptBR from 'date-fns/locale/pt-BR';
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
                    <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200