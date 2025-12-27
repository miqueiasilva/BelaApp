
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Share2, Bell, RefreshCw, Globe, ThumbsUp, 
  Clock, Check, User, DollarSign, Menu, X, Plus, 
  MoreVertical, Ban, MessageSquare, GripVertical
} from 'lucide-react';
import { format, addDays, startOfDay, parseISO, addMinutes } from 'date-fns';
import { ptBR as pt } from 'date-fns/locale/pt-BR';
import { supabase } from '../../services/supabaseClient';
import { LegacyAppointment, LegacyProfessional, AppointmentStatus } from '../../types';
import AppointmentModal from '../modals/AppointmentModal';
import Toast, { ToastType } from '../shared/Toast';

// --- Configurações de Escala ---
const START_HOUR = 8;
const END_HOUR = 21;
const ROW_HEIGHT = 80; 
const PX_PER_MIN = ROW_HEIGHT / 60;

const getEventPosition = (dateStr: string, duration: number) => {
  const date = parseISO(dateStr);
  const minutesFromStart = (date.getHours() - START_HOUR) * 60 + date.getMinutes();
  return {
    top: minutesFromStart * PX_PER_MIN,
    height: Math.max(20, duration * PX_PER_MIN - 2),
  };
};

const AtendimentosView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<LegacyProfessional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'professional' | 'status' | 'payment'>('professional');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(200);

  const [activeModal, setActiveModal] = useState<{ type: 'appt' | 'block', data: any } | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => setToast({ message, type });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const start = startOfDay(currentDate).toISOString();
    const end = addDays(startOfDay(currentDate), 1).toISOString();

    try {
      const [profsRes, apptsRes] = await Promise.all([
        supabase.from('professionals').select('*').eq('active', true).order('name'),
        supabase.from('appointments')
          .select('*')
          .gte('date', start)
          .lt('date', end)
          .neq('status', 'cancelado')
      ]);

      if (profsRes.data) setProfessionals(profsRes.data as any);
      if (apptsRes.data) setAppointments(apptsRes.data);
    } catch (e: any) {
      showToast(e.message || "Erro ao carregar dados", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDragStart = (e: React.DragEvent, apptId: number) => {
    e.dataTransfer.setData('appointmentId', apptId.toString());
  };

  const handleDrop = async (e: React.DragEvent, professionalId: number) => {
    e.preventDefault();
    const apptId = e.dataTransfer.getData('appointmentId');
    if (!apptId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutes = Math.floor(offsetY / (PX_PER_MIN * 15)) * 15;
    const newDate = new Date(currentDate);
    newDate.setHours(START_HOUR + Math.floor(minutes / 60), minutes % 60, 0, 0);

    try {
      const { error } = await supabase.from('appointments')
        .update({ resource_id: professionalId, date: newDate.toISOString() })
        .eq('id', apptId);

      if (error) throw error;
      showToast("Agendamento movido");
      fetchData();
    } catch (e: any) {
      showToast(e.message || "Falha ao mover", "error");
    }
  };

  const timeLabels = useMemo(() => {
    return Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => `${START_HOUR + i}:00`);
  }, []);

  const getStatusColor = (appt: any) => {
    if (viewMode === 'payment') {
      return appt.status === 'concluido' ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white';
    }

    switch (appt.status) {
      case 'confirmado': return 'bg-emerald-600 text-white';
      case 'confirmado_whatsapp': return 'bg-teal-600 text-white';
      case 'bloqueado': return 'bg-slate-200 text-slate-500 stripe-bg';
      case 'em_atendimento': return 'bg-indigo-600 text-white animate-pulse';
      case 'concluido': return 'bg-slate-400 text-white opacity-60';
      default: return 'bg-blue-600 text-white';
    }
  };

  const viewModeOptions = [
    { id: 'professional', label: 'Por Profissional' },
    { id: 'status', label: 'Por Status' },
    { id: 'payment', label: 'Por Pagamento' }
  ];

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden font-sans text-left">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <aside className={`bg-white border-r border-slate-200 transition-all duration-300 flex-shrink-0 ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="p-4 space-y-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opções da Agenda</h3>
          <div className="space-y-3">
             <p className="text-xs font-bold text-slate-600">Zoom das Colunas</p>
             <input type="range" min="140" max="400" value={zoomLevel} onChange={(e) => setZoomLevel(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500" />
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-40 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><Menu size={20}/></button>
            
            <div className="flex items-center bg-slate-100 rounded-xl p-1">
              <button onClick={() => setCurrentDate(addDays(currentDate, -1))} className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-600"><ChevronLeft size={18}/></button>
              <div className="px-3 text-xs font-black text-slate-700 uppercase min-w-[120px] text-center">
                {format(currentDate, "EEE, dd/MMM", { locale: pt })}
              </div>
              <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-600"><ChevronRight size={18}/></button>
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 border border-slate-100"
              >
                <span>{viewModeOptions.find(o => o.id === viewMode)?.label}</span>
                <ChevronLeft size={14} className="-rotate-90" />
              </button>
              
              {isViewMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 p-1 z-50 animate-in fade-in zoom-in-95">
                  {viewModeOptions.map(opt => (
                    <button 
                      key={opt.id} 
                      onClick={() => { setViewMode(opt.id as any); setIsViewMenuOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg"
                    >
                      {opt.label} {viewMode === opt.id && <Check size={14} className="text-orange-500"/>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setIsShareModalOpen(true)} className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all"><Share2 size={20}/></button>
            <button onClick={fetchData} className={`p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all ${isLoading && 'animate-spin'}`}><RefreshCw size={20}/></button>
            <button 
              onClick={() => setActiveModal({ type: 'appt', data: { start: new Date() } })}
              className="bg-orange-500 hover:bg-orange-600 text-white font-black px-5 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 text-xs uppercase ml-2 active:scale-95"
            >
              <Plus size={18}/> Novo Agendamento
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-[#f8fafc] relative custom-scrollbar">
          <div className="min-w-max flex flex-col h-full">
            <div className="sticky top-0 z-30 flex border-b border-slate-200 bg-white/95 backdrop-blur-md">
              <div className="w-[60px] flex-shrink-0 border-r border-slate-200 h-16 flex items-center justify-center">
                <Clock size={16} className="text-slate-300"/>
              </div>
              {professionals.map(prof => (
                <div key={prof.id} style={{ width: zoomLevel }} className="flex-shrink-0 p-3 border-r border-slate-100 flex items-center gap-3">
                  <img src={prof.avatarUrl} className="w-9 h-9 rounded-full border-2 border-orange-100 shadow-sm" alt=""/>
                  <div className="overflow-hidden">
                    <p className="text-[11px] font-black text-slate-800 truncate leading-none mb-1 uppercase tracking-tight">{String(prof.name || '---')}</p>
                    <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-tighter">{String(prof.role || 'Equipe')}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex relative flex-1 min-h-[1200px]">
              <div className="w-[60px] flex-shrink-0 border-r border-slate-200 bg-white sticky left-0 z-20">
                {timeLabels.map(time => (
                  <div key={time} className="h-20 text-[10px] font-black text-slate-400 text-right pr-2 pt-2 border-b border-slate-100/50 border-dashed">
                    {time}
                  </div>
                ))}
              </div>

              {professionals.map(prof => (
                <div 
                  key={prof.id}
                  style={{ width: zoomLevel }}
                  className="flex-shrink-0 border-r border-slate-100 relative group/col h-full"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, prof.id)}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const offsetY = e.clientY - rect.top;
                      const minutes = Math.floor(offsetY / (PX_PER_MIN * 15)) * 15;
                      const d = new Date(currentDate);
                      d.setHours(START_HOUR + Math.floor(minutes / 60), minutes % 60, 0, 0);
                      setActiveModal({ type: 'appt', data: { start: d, professional: prof } });
                    }
                  }}
                >
                  {timeLabels.map((_, i) => <div key={i} className="h-20 border-b border-slate-100/50 border-dashed pointer-events-none"></div>)}

                  {appointments.filter(a => Number(a.resource_id) === prof.id).map(appt => {
                    const pos = getEventPosition(appt.date, appt.duration);
                    return (
                      <div
                        key={appt.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, appt.id)}
                        onClick={(e) => { e.stopPropagation(); setActiveModal({ type: 'appt', data: { ...appt, start: parseISO(appt.date), service: { name: appt.service_name, price: appt.value, duration: appt.duration } } }); }}
                        className={`absolute left-1 right-1 rounded-lg border-l-4 shadow-sm p-1.5 cursor-grab active:cursor-grabbing transition-all hover:brightness-95 overflow-hidden flex flex-col gap-0.5 z-10 ${getStatusColor(appt)}`}
                        style={{ top: pos.top, height: pos.height }}
                      >
                        <div className="flex justify-between items-center text-[9px] font-black opacity-80 pointer-events-none">
                          <span>{format(parseISO(appt.date), "HH:mm")}</span>
                          <div className="flex gap-1">
                            {appt.origem === 'link' && <Globe size={10}/>}
                            {appt.status === 'confirmado' && <ThumbsUp size={10}/>}
                            {appt.status === 'confirmado_whatsapp' && <MessageSquare size={10}/>}
                          </div>
                        </div>
                        <p className="text-[11px] font-black leading-tight truncate pointer-events-none">{String(appt.client_name || 'BLOQUEADO')}</p>
                        {appt.duration >= 30 && (
                          <p className="text-[9px] font-medium leading-none truncate opacity-90 uppercase tracking-tighter pointer-events-none">{String(appt.service_name || '---')}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95">
              <header className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                 <h2 className="text-2xl font-black text-slate-800">Compartilhar Agenda</h2>
                 <button onClick={() => setIsShareModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X size={24}/></button>
              </header>
              <div className="p-8 space-y-6">
                <p className="text-slate-500 font-medium">Use o link abaixo para seus clientes agendarem horários online.</p>
                <div className="bg-slate-100 p-4 rounded-2xl flex items-center gap-3 border border-slate-200 group focus-within:border-orange-500 transition-all">
                  <Globe className="text-slate-400" size={24}/>
                  <input readOnly value={`belaflow.app/bela/${window.location.host.split('.')[0]}`} className="bg-transparent flex-1 font-bold text-slate-700 outline-none select-all" />
                  <button onClick={() => { navigator.clipboard.writeText(`belaflow.app/bela/${window.location.host.split('.')[0]}`); showToast("Copiado!"); }} className="bg-orange-500 text-white font-black px-6 py-2.5 rounded-xl shadow-lg active:scale-95 transition-all text-xs uppercase">Copiar</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {activeModal?.type === 'appt' && (
        <AppointmentModal 
          appointment={activeModal.data} 
          onClose={() => setActiveModal(null)} 
          onSave={async (app) => {
            const payload = {
              client_name: app.client?.nome || String(app.client_name || 'Bloqueado'),
              resource_id: app.professional.id,
              professional_name: app.professional.name,
              service_name: app.service.name,
              value: app.service.price,
              duration: app.service.duration,
              date: app.start.toISOString(),
              status: app.status || 'agendado',
              notas: app.notas,
              origem: 'interno'
            };
            
            const { error } = app.id 
              ? await supabase.from('appointments').update(payload).eq('id', app.id)
              : await supabase.from('appointments').insert([payload]);
              
            if (error) throw error;
            showToast("Agenda atualizada!");
            setActiveModal(null);
            fetchData();
          }} 
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .stripe-bg {
          background-image: linear-gradient(45deg, #cbd5e1 25%, transparent 25%, transparent 50%, #cbd5e1 50%, #cbd5e1 75%, transparent 75%, transparent);
          background-size: 8px 8px;
          opacity: 0.8;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
};

export default AtendimentosView;
