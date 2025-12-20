
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
    ChevronLeft, ChevronRight, Plus, RefreshCw, 
    User as UserIcon, Calendar as CalendarIcon,
    Settings, Bell, Search, Filter, Layers, 
    Maximize2, Minimize2, Check, X, SlidersHorizontal,
    Lock, Clock
} from 'lucide-react';
import { format, addDays, isSameDay, differenceInMinutes } from 'date-fns';
import { pt } from 'date-fns/locale';

import { LegacyAppointment, AppointmentStatus, LegacyProfessional } from '../../types';
import AppointmentModal from '../modals/AppointmentModal';
import AppointmentDetailPopover from '../shared/AppointmentDetailPopover';
import ContextMenu from '../shared/ContextMenu';
import Toast, { ToastType } from '../shared/Toast';
import { supabase } from '../../services/supabaseClient';

// --- Constantes de Layout ---
const START_HOUR = 8;
const END_HOUR = 21; 
const ROW_HEIGHT = 80; // Altura base para 60min

interface AtendimentosViewProps {
    onAddTransaction: (t: any) => void;
}

const AtendimentosView: React.FC<AtendimentosViewProps> = () => {
    // --- Estados de Dados ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState<LegacyAppointment[]>([]);
    const [professionals, setProfessionals] = useState<LegacyProfessional[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notifications, setNotifications] = useState(0);

    // --- Estados de Visualização (Painel de Controle) ---
    const [colWidth, setColWidth] = useState(220); // Zoom
    const [timeSlotInterval, setTimeSlotInterval] = useState<15 | 30 | 60>(30);
    const [colorMode, setColorMode] = useState<'professional' | 'status'>('professional');
    const [visibleProfIds, setVisibleProfIds] = useState<number[]>([]);
    const [showMobileSettings, setShowMobileSettings] = useState(false);

    // --- Estados de UI ---
    const [modalState, setModalState] = useState<{ type: 'appointment' | 'block'; data: any } | null>(null);
    const [activeDetail, setActiveDetail] = useState<LegacyAppointment | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; time: string; profId: number } | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const appointmentRefs = useRef(new Map<number, HTMLDivElement | null>());

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        setToast({ message, type });
    }, []);

    // --- Integração Supabase ---
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Profissionais
            const { data: profs, error: pErr } = await supabase
                .from('professionals')
                .select('*')
                .eq('active', true)
                .order('display_order', { ascending: true });
            
            if (pErr) throw pErr;
            
            const mappedProfs = (profs || []).map(p => ({
                id: p.id,
                name: p.name,
                avatarUrl: p.photo_url || `https://ui-avatars.com/api/?name=${p.name}&background=random`,
                role: p.role,
                color: p.color || '#3b82f6'
            }));
            
            setProfessionals(mappedProfs);
            if (visibleProfIds.length === 0) {
                setVisibleProfIds(mappedProfs.map(p => p.id));
            }

            // 2. Agendamentos
            const { data: apps, error: aErr } = await supabase
                .from('appointments')
                .select('*')
                .gte('date', currentDate.toISOString().split('T')[0])
                .lte('date', currentDate.toISOString().split('T')[0] + 'T23:59:59');
            
            if (aErr) throw aErr;

            const mappedApps: LegacyAppointment[] = (apps || []).map(row => {
                const start = new Date(row.date);
                const end = row.end_date ? new Date(row.end_date) : new Date(start.getTime() + 30 * 60000);
                const prof = mappedProfs.find(p => p.id === Number(row.resource_id)) || mappedProfs[0];

                return {
                    id: row.id,
                    start, end,
                    status: (row.status as AppointmentStatus) || 'agendado',
                    client: { id: 0, nome: row.client_name || 'Cliente', consent: true },
                    professional: prof,
                    service: { id: 0, name: row.service_name || 'Serviço', price: parseFloat(row.value), duration: 30, color: row.color || '#3b82f6' },
                    notas: row.notes
                };
            });

            setAppointments(mappedApps);
            setNotifications(mappedApps.filter(a => (a as any).origem === 'link').length);

        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [currentDate, visibleProfIds.length, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Helpers de Renderização ---
    const timeSlots = useMemo(() => {
        const slots = [];
        const slotsPerHour = 60 / timeSlotInterval;
        for (let h = START_HOUR; h < END_HOUR; h++) {
            for (let i = 0; i < slotsPerHour; i++) {
                const m = i * timeSlotInterval;
                slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            }
        }
        return slots;
    }, [timeSlotInterval]);

    const getAppStyle = (app: LegacyAppointment) => {
        const startMinutes = app.start.getHours() * 60 + app.start.getMinutes();
        const endMinutes = app.end.getHours() * 60 + app.end.getMinutes();
        const pixelsPerMin = ROW_HEIGHT / 60;
        
        const top = (startMinutes - START_HOUR * 60) * pixelsPerMin;
        const height = (endMinutes - startMinutes) * pixelsPerMin;

        // Lógica de Cores
        let bgColor = app.professional.color;
        if (colorMode === 'status') {
            switch(app.status) {
                case 'concluido': bgColor = '#10b981'; break; // Emerald
                case 'bloqueado': bgColor = '#64748b'; break; // Slate
                case 'cancelado': bgColor = '#f43f5e'; break; // Rose
                case 'agendado': bgColor = '#f59e0b'; break; // Amber
                default: bgColor = '#3b82f6';
            }
        }

        return {
            top: `${top}px`,
            height: `${height - 2}px`,
            backgroundColor: bgColor,
            borderLeft: `4px solid rgba(0,0,0,0.1)`
        };
    };

    const handleSaveAppointment = async (app: LegacyAppointment) => {
        setModalState(null);
        setIsLoading(true);
        try {
            const isBlock = app.status === 'bloqueado';
            const payload = {
                client_name: isBlock ? 'BLOQUEIO' : (app.client?.nome || 'Cliente'),
                service_name: isBlock ? 'Indisponível' : (app.service?.name || 'Serviço'),
                resource_id: app.professional.id,
                professional_name: app.professional.name,
                date: app.start.toISOString(),
                end_date: app.end.toISOString(),
                value: app.service.price || 0,
                status: app.status || 'agendado',
                color: isBlock ? '#64748b' : app.service.color,
                type: isBlock ? 'block' : 'appointment'
            };

            const { error } = app.id && app.id < 1e10
                ? await supabase.from('appointments').update(payload).eq('id', app.id)
                : await supabase.from('appointments').insert([payload]);

            if (error) throw error;
            showToast("Agenda atualizada!");
            fetchData();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Componente de Ajustes (Reutilizável) ---
    const SettingsContent = () => (
        <div className="space-y-8 p-1">
            {/* Zoom */}
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                    Zoom da Grade <span>{colWidth}px</span>
                </label>
                <input 
                    type="range" min="150" max="350" step="10"
                    value={colWidth} onChange={(e) => setColWidth(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
            </div>

            {/* Intervalo */}
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precisão de Horário</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                    {[15, 30, 60].map(val => (
                        <button 
                            key={val} 
                            onClick={() => setTimeSlotInterval(val as any)}
                            className={`py-2 text-[10px] font-black rounded-lg transition-all ${timeSlotInterval === val ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            {val} MIN
                        </button>
                    ))}
                </div>
            </div>

            {/* Modo de Cores */}
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Esquema de Cores</label>
                <div className="space-y-2">
                    <button 
                        onClick={() => setColorMode('professional')}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${colorMode === 'professional' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 text-slate-600'}`}
                    >
                        <span className="text-xs font-bold">Por Profissional</span>
                        <UserIcon size={14} />
                    </button>
                    <button 
                        onClick={() => setColorMode('status')}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${colorMode === 'status' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 text-slate-600'}`}
                    >
                        <span className="text-xs font-bold">Por Status (Fluxo)</span>
                        <Filter size={14} />
                    </button>
                </div>
            </div>

            {/* Filtro de Equipe */}
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exibir Profissionais</label>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                    {professionals.map(p => (
                        <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                            <input 
                                type="checkbox" 
                                checked={visibleProfIds.includes(p.id)} 
                                onChange={() => setVisibleProfIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                                className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                            />
                            <div className="flex items-center gap-2">
                                <img src={p.avatarUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
                                <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">{p.name}</span>
                            </div>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* SIDEBAR DESKTOP */}
            <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col flex-shrink-0 z-20">
                <div className="p-6 border-b border-slate-100 h-20 flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <SlidersHorizontal size={20} className="text-orange-500" /> Painel Agenda
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <SettingsContent />
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <p className="text-[10px] font-black text-slate-500 uppercase">Sincronizado com Banco</p>
                    </div>
                </div>
            </aside>

            {/* CONTEÚDO PRINCIPAL */}
            <div className="flex-1 flex flex-col min-w-0">
                
                {/* HEADER RESPONSIVO */}
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 flex-shrink-0 z-30">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setShowMobileSettings(true)}
                            className="lg:hidden p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-all"
                        >
                            <Settings size={20} />
                        </button>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setCurrentDate(prev => addDays(prev, -1))} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-800 transition-colors"><ChevronLeft size={22} /></button>
                            <div className="flex flex-col items-center min-w-[140px] lg:min-w-[180px]">
                                <span className="text-sm lg:text-base font-black text-slate-800 capitalize leading-none">
                                    {format(currentDate, "EEEE", { locale: pt })}
                                </span>
                                <span className="text-[10px] lg:text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                    {format(currentDate, "dd 'de' MMMM", { locale: pt })}
                                </span>
                            </div>
                            <button onClick={() => setCurrentDate(prev => addDays(prev, 1))} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-800 transition-colors"><ChevronRight size={22} /></button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-4">
                        <div className="relative">
                            <button className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all relative group">
                                <Bell size={22} />
                                {notifications > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>}
                            </button>
                        </div>
                        <button onClick={fetchData} className="hidden sm:flex p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-all">
                            <RefreshCw size={22} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button 
                            onClick={() => setModalState({ type: 'appointment', data: { start: currentDate, professional: professionals[0] } })}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-black text-xs lg:text-sm py-2.5 px-4 lg:px-6 rounded-xl shadow-lg shadow-orange-100 flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Plus size={18} /> <span className="hidden sm:inline">AGENDAR</span>
                        </button>
                    </div>
                </header>

                {/* ÁREA DA GRADE */}
                <div className="flex-1 flex overflow-hidden">
                    <div 
                        ref={scrollRef}
                        className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide relative bg-slate-50"
                    >
                        <div 
                            className="inline-grid min-w-full"
                            style={{ 
                                gridTemplateColumns: `60px repeat(${visibleProfIds.length}, ${colWidth}px)`,
                                minHeight: '100%'
                            }}
                        >
                            {/* Cabeçalho de Colunas */}
                            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 h-20 flex items-center justify-center"></div>
                            {professionals.filter(p => visibleProfIds.includes(p.id)).map(prof => (
                                <div key={prof.id} className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 border-r border-slate-100 flex flex-col items-center justify-center p-2 group">
                                    <div className="flex items-center gap-3 w-full px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-orange-200 transition-all">
                                        <img src={prof.avatarUrl} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" alt="" />
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[11px] font-black text-slate-800 truncate leading-none mb-1 uppercase">{prof.name.split(' ')[0]}</span>
                                            <span className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-widest">{prof.role || 'PRO'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Coluna de Tempo */}
                            <div className="relative border-r border-slate-100 bg-white z-20">
                                {timeSlots.map(time => (
                                    <div key={time} className="h-10 text-right pr-3 text-[10px] text-slate-400 font-black pt-2 border-b border-slate-100/50 border-dashed">
                                        <span>{time}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Células da Grade */}
                            {professionals.filter(p => visibleProfIds.includes(p.id)).map(prof => (
                                <div key={prof.id} className="relative border-r border-slate-100 min-h-[1200px]">
                                    {timeSlots.map((time, i) => (
                                        <div 
                                            key={i} 
                                            onClick={() => {
                                                const [h, m] = time.split(':').map(Number);
                                                const start = new Date(currentDate);
                                                start.setHours(h, m, 0, 0);
                                                setModalState({ type: 'appointment', data: { start, professional: prof } });
                                            }}
                                            className="h-10 border-b border-slate-100/30 border-dashed cursor-cell hover:bg-orange-50/10 transition-colors"
                                        ></div>
                                    ))}

                                    {/* Cards de Agendamento */}
                                    {appointments.filter(app => Number(app.professional.id) === prof.id).map(app => {
                                        const duration = differenceInMinutes(app.end, app.start);
                                        const isShort = duration <= 30;

                                        return (
                                            <div
                                                key={app.id}
                                                ref={(el) => { appointmentRefs.current.set(app.id, el); }}
                                                onClick={(e) => { e.stopPropagation(); setActiveDetail(app); }}
                                                style={getAppStyle(app)}
                                                className={`absolute left-1/2 -translate-x-1/2 w-[92%] rounded-xl shadow-lg p-2 cursor-pointer hover:scale-[1.02] transition-all z-10 overflow-hidden text-white flex flex-col justify-center border border-white/20`}
                                            >
                                                <p className="font-black truncate text-[11px] uppercase leading-tight drop-shadow-sm">
                                                    {app.client?.nome || 'BLOQUEIO'}
                                                </p>
                                                {!isShort && (
                                                    <p className="text-[10px] font-bold truncate opacity-90 leading-tight mt-1">
                                                        {app.service.name}
                                                    </p>
                                                )}
                                                {duration > 45 && (
                                                    <div className="flex items-center gap-1 mt-1 opacity-70">
                                                        <Clock size={10} />
                                                        <span className="text-[9px] font-black uppercase">{format(app.start, 'HH:mm')}</span>
                                                    </div>
                                                )}
                                                {app.status === 'bloqueado' && <Lock size={12} className="absolute top-2 right-2 opacity-30" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DE AJUSTES MOBILE */}
            {showMobileSettings && (
                <div className="fixed inset-0 z-[100] flex items-end lg:hidden animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobileSettings(false)}></div>
                    <div className="relative w-full bg-white rounded-t-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-slate-800">Ajustes de Visualização</h3>
                            <button onClick={() => setShowMobileSettings(false)} className="p-2 bg-slate-50 text-slate-400 rounded-full"><X size={24}/></button>
                        </div>
                        <SettingsContent />
                        <button 
                            onClick={() => setShowMobileSettings(false)}
                            className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl mt-10 transition-all active:scale-95 shadow-xl"
                        >
                            FECHAR E APLICAR
                        </button>
                    </div>
                </div>
            )}

            {/* Modais de Fluxo */}
            {modalState?.type === 'appointment' && <AppointmentModal appointment={modalState.data} onClose={() => setModalState(null)} onSave={handleSaveAppointment} />}
            
            {activeDetail && (
                <AppointmentDetailPopover 
                    appointment={activeDetail} 
                    targetElement={appointmentRefs.current.get(activeDetail.id) || null} 
                    onClose={() => setActiveDetail(null)} 
                    onEdit={(app) => setModalState({ type: 'appointment', data: app })} 
                    onDelete={async (id) => { 
                        if(window.confirm("Remover agendamento?")){ 
                            await supabase.from('appointments').delete().eq('id', id); 
                            fetchData(); 
                            setActiveDetail(null); 
                        }
                    }} 
                    onUpdateStatus={async (id, status) => { 
                        await supabase.from('appointments').update({ status }).eq('id', id); 
                        fetchData(); 
                        setActiveDetail(null); 
                    }} 
                />
            )}
        </div>
    );
};

export default AtendimentosView;
