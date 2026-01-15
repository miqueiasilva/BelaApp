
import React from 'react';
import Card from '../shared/Card';
import JaciBotAssistant from '../shared/JaciBotAssistant';
import TodayScheduleWidget from '../dashboard/TodayScheduleWidget';
import WeeklyChart from '../charts/WeeklyChart';
import { getDashboardInsight } from '../../services/geminiService';
import { DollarSign, Calendar, Users, TrendingUp } from 'lucide-react';
import { ViewState } from '../../types';

interface DashboardViewProps {
  onNavigate: (view: ViewState) => void;
}

const StatCard: React.FC<{ title: string, value: string, icon: React.ReactNode, color: string }> = ({ title, value, icon, color }) => (
  <Card className="flex-1">
    <div className="flex items-center gap-4">
      <div className={`p-3 ${color} text-white rounded-full`}>{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  </Card>
);

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Resumo do Estúdio</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Receita (Mês)" value="R$ 12.450" icon={<DollarSign className="w-6 h-6" />} color="bg-emerald-500" />
        <StatCard title="Atendimentos (Mês)" value="142" icon={<Calendar className="w-6 h-6" />} color="bg-blue-500" />
        <StatCard title="Novos Clientes" value="28" icon={<Users className="w-6 h-6" />} color="bg-purple-500" />
        <StatCard title="Taxa de Retenção" value="84%" icon={<TrendingUp className="w-6 h-6" />} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <JaciBotAssistant fetchInsight={getDashboardInsight} />
          <Card title="Evolução Semanal" icon={<TrendingUp className="w-5 h-5"/>}>
            <WeeklyChart data={[
              { day: 'Seg', count: 12 },
              { day: 'Ter', count: 18 },
              { day: 'Qua', count: 15 },
              { day: 'Qui', count: 22 },
              { day: 'Sex', count: 28 },
              { day: 'Sáb', count: 32 },
              { day: 'Dom', count: 5 }
            ]} />
          </Card>
        </div>
        <div className="lg:col-span-1">
          <TodayScheduleWidget onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
