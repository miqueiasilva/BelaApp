import React from 'react';
import Card from '../shared/Card';
import { Clock, DollarSign, Star, Calendar, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

const professionalData = {
  name: "Maria Silva",
  avatarUrl: "https://i.pravatar.cc/150?img=1",
  kpis: [
    { title: "Próximo Atendimento", value: "11:00", icon: <Clock className="w-6 h-6" /> },
    { title: "Comissão do Dia", value: "R$ 135,00", icon: <DollarSign className="w-6 h-6" /> },
    { title: "Sua Avaliação Média", value: "4.9", icon: <Star className="w-6 h-6" /> }
  ],
  schedule: [
    { time: "09:00 - 10:00", service: "Corte Feminino", client: "Juliana Paes", status: "Concluído" },
    { time: "11:00 - 12:00", service: "Coloração", client: "Marina Ruy Barbosa", status: "Confirmado" },
    { time: "15:00 - 15:30", service: "Manicure", client: "Juliana Paes", status: "Agendado" }
  ],
  reviews: [
    { client: "Juliana P.", rating: 5, comment: "Adorei o corte, a Maria é uma profissional incrível!", avatar: "https://i.pravatar.cc/150?img=35" },
    { client: "Fernanda L.", rating: 5, comment: "Sempre saio do salão me sentindo maravilhosa. Recomendo!", avatar: "https://i.pravatar.cc/150?img=36" }
  ]
};

const KpiCard: React.FC<{ title: string, value: string, icon: React.ReactNode }> = ({ title, value, icon }) => (
  <Card className="flex-1">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-teal-100/60 text-teal-600 rounded-full">{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  </Card>
);

const ProfessionalDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <img src={professionalData.avatarUrl} alt={professionalData.name} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md" />
        <div>
          <h2 className="text-2xl font-bold">Olá, {professionalData.name}!</h2>
          <p className="text-slate-500">Este é o resumo do seu dia. Tenha um ótimo trabalho!</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {professionalData.kpis.map(kpi => <KpiCard key={kpi.title} title={kpi.title} value={kpi.value} icon={kpi.icon} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Sua Agenda de Hoje" icon={<Calendar className="w-5 h-5"/>}>
          <div className="space-y-4">
            {professionalData.schedule.map((item, index) => (
              <div key={`${item.time}-${item.client}-${index}`} className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg">
                <div className="text-sm font-semibold text-cyan-700 bg-cyan-100 px-3 py-1 rounded-md">{item.time.split(' ')[0]}</div>
                <div>
                  <p className="font-semibold">{item.service}</p>
                  <p className="text-sm text-slate-500">Cliente: {item.client}</p>
                </div>
                <div className="ml-auto text-xs font-medium text-slate-600 bg-slate-200 px-2 py-1 rounded-full">{item.status}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Suas Avaliações Recentes" icon={<MessageSquare className="w-5 h-5" />}>
           <div className="space-y-5">
            {professionalData.reviews.map((review, index) => (
              <div key={`${review.client}-${index}`} className="flex items-start gap-4">
                <img src={review.avatar} alt={review.client} className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-sm">{review.client}</p>
                    <div className="flex items-center gap-1 text-sm font-bold text-amber-500">
                        {review.rating} <Star className="w-4 h-4 fill-current text-amber-400" />
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 italic mt-1">"{review.comment}"</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfessionalDashboard;
