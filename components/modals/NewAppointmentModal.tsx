
import React, { useState } from 'react';
import { X, Calendar, Clock, User, Scissors, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { format } from 'date-fns';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any;
}

const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    client_name: '',
    service_name: '',
    date: initialData?.start ? format(initialData.start, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    time: initialData?.start ? format(initialData.start, "HH:mm") : "09:00",
    value: '',
    professional_id: initialData?.professional?.id || '',
    professional_name: initialData?.professional?.name || ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const startDateTime = new Date(`${formData.date}T${formData.time}:00`);
      
      const payload = {
        client_name: formData.client_name,
        service_name: formData.service_name,
        professional_name: formData.professional_name,
        resource_id: formData.professional_id,
        date: startDateTime.toISOString(),
        value: parseFloat(formData.value) || 0,
        status: 'agendado',
        origem: 'interno'
      };

      const { error } = await supabase.from('appointments').insert([payload]);

      if (error) throw error;

      // SUCESSO: Primeiro notificamos a view, depois fechamos
      if (onSuccess) onSuccess();
      onClose();
      
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-black text-slate-800 uppercase tracking-widest text-sm">Novo Agendamento</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400"><X size={20}/></button>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-orange-200 transition-all">
              <User size={18} className="text-slate-400" />
              <input required value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} placeholder="Nome do cliente" className="bg-transparent w-full outline-none font-bold text-slate-700" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Serviço</label>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-orange-200 transition-all">
              <Scissors size={18} className="text-slate-400" />
              <input required value={formData.service_name} onChange={e => setFormData({...formData, service_name: e.target.value})} placeholder="Ex: Design de Sobrancelha" className="bg-transparent w-full outline-none font-bold text-slate-700" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-200" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora</label>
              <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-200" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor (R$)</label>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
              <DollarSign size={18} className="text-emerald-500" />
              <input type="number" step="0.01" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} placeholder="0,00" className="bg-transparent w-full outline-none font-black text-slate-800" />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-[24px] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 mt-4"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : 'CONFIRMAR AGENDAMENTO'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewAppointmentModal;
