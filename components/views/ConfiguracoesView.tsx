
import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Scissors, 
  Users, 
  Clock, 
  Bell, 
  CreditCard, 
  Save, 
  DollarSign,
  CheckCircle,
  AlertCircle
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
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    // Tenta buscar a primeira linha de configuração
    const { data } = await supabase.from('studio_settings').select('*').limit(1).single();
    if (data) {
      setSettings({
        studio_name: data.studio_name || '',
        address: data.address || '',
        phone: data.phone || ''
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Verifica se já existe configuração
      const { data: existing } = await supabase.from('studio_settings').select('id').limit(1).single();

      if (existing) {
        await supabase.from('studio_settings').update(settings).eq('id', existing.id);
      } else {
        await supabase.from('studio_settings').insert([settings]);
      }
      alert('Dados do estúdio salvos!');
    } catch (error) {
      console.error(error);
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
          <input 
            type="text" 
            value={settings.studio_name}
            onChange={e => setSettings({...settings, studio_name: e.target.value})}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            placeholder="Ex: Studio Bela"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Whatsapp / Telefone</label>
          <input 
            type="text" 
            value={settings.phone}
            onChange={e => setSettings({...settings, phone: e.target.value})}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            placeholder="(00) 00000-0000"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Endereço Completo</label>
          <input 
            type="text" 
            value={settings.address}
            onChange={e => setSettings({...settings, address: e.target.value})}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            placeholder="Rua, Número, Bairro"
          />
        </div>
        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="bg-orange-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors flex items-center gap-2"
          >
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase.from('services').select('*').order('name');
      if (data) setServices(data);
      setLoading(false);
    };
    fetchServices();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-orange-500" /> Catálogo de Serviços
        </h3>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {services.length} cadastrados
        </span>
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
            {loading ? (
              <tr><td colSpan={3} className="p-4 text-center">Carregando...</td></tr>
            ) : services.length === 0 ? (
              <tr><td colSpan={3} className="p-4 text-center text-gray-400">Nenhum serviço encontrado.</td></tr>
            ) : (
              services.map(service => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{service.name}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{service.duration} min</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">
                    R$ {service.price?.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-4 text-center">Para adicionar novos serviços, vá ao menu "Serviços" na barra lateral principal.</p>
    </div>
  );
};

// 3. ABA HORÁRIOS
const HorariosTab = () => {
  const [loading, setLoading] = useState(false);
  const days = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
  const [schedule, setSchedule] = useState<any>({});

  useEffect(() => {
    const loadSchedule = async () => {
      const { data } = await supabase.from('studio_settings').select('work_schedule').limit(1).single();
      if (data?.work_schedule) {
        setSchedule(data.work_schedule);
      } else {
        // Padrão inicial se vazio
        const initial = {};
        days.forEach(d => initial[d] = { active: true, start: '09:00', end: '18:00' });
        setSchedule(initial);
      }
    };
    loadSchedule();
  }, []);

  const handleChange = (day: string, field: string, value: any) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...(prev[day] || { active: false, start: '09:00', end: '18:00' }),
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: existing } = await supabase.from('studio_settings').select('id').limit(1).single();
      if (existing) {
        await supabase.from('studio_settings').update({ work_schedule: schedule }).eq('id', existing.id);
      } else {
        await supabase.from('studio_settings').insert([{ work_schedule: schedule }]);
      }
      alert('Horários de funcionamento atualizados!');
    } catch (e) {
      alert('Erro ao salvar horários.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" /> Horário de Funcionamento Geral
        </h3>
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
        >
          {loading ? '...' : 'Salvar Grade'}
        </button>
      </div>
      
      <div className="space-y-3">
        {days.map(day => {
          const dayConfig = schedule[day] || { active: false, start: '09:00', end: '18:00' };
          return (
            <div key={day} className={`flex items-center justify-between p-3 border rounded-lg ${dayConfig.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={dayConfig.active} 
                  onChange={e => handleChange(day, 'active', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className={`capitalize font-bold w-24 ${dayConfig.active ? 'text-gray-700' : 'text-gray-400'}`}>{day
