
import React, { useState, useEffect } from 'react';
import { 
  Building2, Scissors, Users, Clock, Bell, DollarSign, 
  Save, CheckCircle, CreditCard, AlertCircle 
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

// --- SUB-COMPONENTES DAS ABAS ---

// 1. ABA ESTÚDIO
const StudioTab = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    studio_name: '',
    address: '',
    phone: ''
  });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('studio_settings').select('*').limit(1).single();
      if (data) setSettings({ 
        studio_name: data.studio_name || '', 
        address: data.address || '', 
        phone: data.phone || '' 
      });
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: existing } = await supabase.from('studio_settings').select('id').limit(1).single();
      if (existing) {
        await supabase.from('studio_settings').update(settings).eq('id', existing.id);
      } else {
        await supabase.from('studio_settings').insert([settings]);
      }
      alert('Dados do estúdio salvos!');
    } catch (error) {
      alert('Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 animate-in fade-in">
      <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-orange-500" /> Dados do Estúdio
      </h3>
      <div className="grid grid-cols-1 gap-6 max-w-2xl">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Comercial</label>
          <input type="text" value={settings.studio_name} onChange={e => setSettings({...settings, studio_name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-orange-500" placeholder="Nome do seu negócio" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Whatsapp / Telefone</label>
          <input type="text" value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-orange-500" placeholder="(00) 00000-0000" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Endereço</label>
          <input type="text" value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-orange-500" placeholder="Endereço completo" />
        </div>
        <div className="flex justify-end pt-4">
          <button onClick={handleSave} disabled={loading} className="bg-orange-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors flex items-center gap-2">
            <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Informações'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. ABA SERVIÇOS
const ServicosTab = () => {
  const [services, setServices] = useState<any[]>([]);
  
  useEffect(() => {
    supabase.from('services').select('*').order('name').then(({ data }) => {
      if (data) setServices(data);
    });
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-orange-500" /> Catálogo de Serviços
        </h3>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{services.length} cadastrados</span>
      </div>
      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Serviço</th>
              <th className="px-4 py-3 text-center">Duração</th>
              <th className="px-4 py-3 text-right">Preço</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map(service => (
              <tr key={service.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{service.name}</td>
                <td className="px-4 py-3 text-center text-gray-500">{service.duration} min</td>
                <td className="px-4 py-3 text-right font-bold text-green-600">R$ {service.price?.toFixed(2)}</td>
              </tr>
            ))}
             {services.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-gray-400">Nenhum serviço encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-4 text-center">Gerencie os serviços completos no menu "Serviços" lateral.</p>
    </div>
  );
};

// 3. ABA HORÁRIOS
const HorariosTab = () => {
  const [loading, setLoading] = useState(false);
  const days = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
  const [schedule, setSchedule] = useState<any>({});

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('studio_settings').select('work_schedule').limit(1).single();
      if (data?.work_schedule) {
        setSchedule(data.work_schedule);
      } else {
        const initial: any = {};
        days.forEach(d => initial[d] = { active: true, start: '09:00', end: '18:00' });
        setSchedule(initial);
      }
    };
    fetch();
  }, []);

  const handleChange = (day: string, field: string, value: any) => {
    setSchedule((prev: any) => ({
      ...prev,
      [day]: { ...(prev[day] || { active: false, start: '09:00', end: '18:00' }), [field]: value }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    const { data: existing } = await supabase.from('studio_settings').select('id').limit(1).single();
    if (existing) {
      await supabase.from('studio_settings').update({ work_schedule: schedule }).eq('id', existing.id);
    } else {
      await supabase.from('studio_settings').insert([{ work_schedule: schedule }]);
    }
    setLoading(false);
    alert('Horários atualizados!');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" /> Horário de Funcionamento
        </h3>
        <button onClick={handleSave} disabled={loading} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700">
          {loading ? '...' : 'Salvar Grade'}
        </button>
      </div>
      <div className="space-y-3">
        {days.map(day => {
          const cfg = schedule[day] || { active: false, start: '09:00', end: '18:00' };
          return (
            <div key={day} className={`flex items-center justify-between p-3 border rounded-lg ${cfg.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={cfg.active} onChange={e => handleChange(day, 'active', e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
                <span className={`capitalize font-bold w-24 ${cfg.active ? 'text-gray-700' : 'text-gray-400'}`}>{day}</span>
              </div>
              {cfg.active ? (
                <div className="flex items-center gap-2">
                  <input type="time" value={cfg.start} onChange={e => handleChange(day, 'start', e.target.value)} className="p-1 border rounded text-sm" />
                  <span className="text-gray-400 text-xs">até</span>
                  <input type="time" value={cfg.end} onChange={e => handleChange(day, 'end', e.target.value)} className="p-1 border rounded text-sm" />
                </div>
              ) : <span className="text-xs font-bold text-gray-400 uppercase">Fechado</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 4. ABA FINANCEIRO
const FinanceiroTab = () => {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('payment_methods').select('*').order('name').then(({ data }) => { if (data) setMethods(data); });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    for (const m of methods) {
      await supabase.from('payment_methods').update({ fee_percentage: parseFloat(m.fee_percentage) }).eq('id', m.id);
    }
    setLoading(false);
    alert('Taxas salvas!');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 animate-in fade-in">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600" /> Taxas de Cartão</h3>
        <p className="text-sm text-gray-500">Defina as taxas para cálculo automático de comissões líquidas.</p>
      </div>
      <div className="space-y-4">
        {methods.map(m => (
          <div key={m.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white border rounded text-gray-500"><CreditCard size={20} /></div>
              <div><p className="font-bold text-gray-800">{m.name}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" step="0.01" value={m.fee_percentage} onChange={(e) => setMethods(methods.map(x => x.id === m.id ? { ...x, fee_percentage: e.target.value } : x))} className="w-20 p-2 text-right border border-gray-300 rounded font-bold text-sm outline-none" />
              <span className="text-gray-500 font-bold">%</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button onClick={handleSave} disabled={loading} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2">
          <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Taxas'}
        </button>
      </div>
    </div>
  );
};

// 5. ABA AVISOS
const AvisosTab = () => {
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('studio_settings').select('general_notice').limit(1).single()
      .then(({ data }) => { if (data) setNotice(data.general_notice || ''); });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    const { data: existing } = await supabase.from('studio_settings').select('id').limit(1).single();
    if (existing) {
        await supabase.from('studio_settings').update({ general_notice: notice }).eq('id', existing.id);
    } else {
        await supabase.from('studio_settings').insert([{ general_notice: notice }]);
    }
    setLoading(false);
    alert('Aviso publicado!');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 animate-in fade-in">
       <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-yellow-500" /> Mural de Avisos</h3>
       <textarea rows={6} value={notice} onChange={e => setNotice(e.target.value)} className="w-full p-4 border border-gray-200 rounded-lg outline-none resize-none bg-yellow-50/30" placeholder="Escreva um comunicado para a equipe..." />
       <div className="mt-4 flex justify-end">
         <button onClick={handleSave} disabled={loading} className="bg-orange-500 text-white px-6 py-2 rounded-lg font-bold">
           {loading ? 'Salvando...' : 'Publicar Aviso'}
         </button>
       </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

const ConfiguracoesView = () => {
  const [activeTab, setActiveTab] = useState('studio');

  const menuItems = [
    { id: 'studio', label: 'Estúdio', icon: Building2 },
    { id: 'services', label: 'Serviços', icon: Scissors },
    { id: 'collaborators', label: 'Colaboradores', icon: Users },
    { id: 'finance', label: 'Financeiro', icon: DollarSign }, 
    { id: 'schedule', label: 'Horários', icon: Clock },
    { id: 'notices', label: 'Avisos', icon: Bell },
  ];

  return (
    <div className="flex flex-col md:flex-row h-full gap-6">
      <aside className="w-full md:w-64 bg-white rounded-lg shadow-sm border border-gray-100 p-4 h-fit">
        <h2 className="text-xs font-bold text-gray-400 uppercase mb-4 px-2">Configurações</h2>
        <nav className="space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{menuItems.find(i => i.id === activeTab)?.label}</h1>
          <p className="text-gray-500 text-sm">Gerencie as preferências globais do negócio</p>
        </div>

        {activeTab === 'studio' && <StudioTab />}
        {activeTab === 'finance' && <FinanceiroTab />}
        {activeTab === 'services' && <ServicosTab />}
        {activeTab === 'schedule' && <HorariosTab />}
        {activeTab === 'notices' && <AvisosTab />}
        
        {activeTab === 'collaborators' && (
           <div className="bg-white p-10 text-center rounded-lg border border-dashed border-gray-300">
             <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
             <p className="text-gray-500 font-medium">Gestão de Equipe</p>
             <p className="text-sm text-gray-400 mt-1">Utilize o menu "Colaboradores" na barra lateral esquerda principal para gerenciar perfis, comissões e permissões.</p>
           </div>
        )}
      </main>
    </div>
  );
};

export default ConfiguracoesView;
