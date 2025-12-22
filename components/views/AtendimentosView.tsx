
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
    ChevronLeft, ChevronRight, Plus, RefreshCw, 
    User as UserIcon, Settings, Bell, 
    X, Lock, Clock, PanelLeftClose, PanelLeftOpen, Maximize2,
    Palette, AlertTriangle, Loader2, Globe
} from 'lucide-react';
import { format, addDays, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { pt } from 'date-fns/locale';

import { LegacyAppointment, AppointmentStatus, LegacyProfessional } from '../../types';
import NewAppointmentModal from '../modals/NewAppointmentModal';
import AppointmentDetailPopover from '../shared/AppointmentDetailPopover';
import Toast, { ToastType } from '../shared/Toast';
import { supabase } from '../../services/supabaseClient';
import ToggleSwitch from '../shared/ToggleSwitch';

const START_HOUR = 8;
const END_HOUR = 21; 
const BASE_ROW_HEIGHT = 80; 

const AtendimentosView: React.FC = () => {
    // --- Estados de Dados ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState<LegacyAppointment[]>([]);
    const [professionals, setProfessionals] = useState<LegacyProfessional[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // --- Estados de Layout ---
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isAutoWidth, setIsAutoWidth] = useState(true);
    const [manualColWidth, setManualColWidth] = useState(240);
    const [intervalMin, setIntervalMin] = useState<15 | 30 | 60>(30);
    const [visibleProfIds, setVisibleProfIds] = useState<number[]>([]);
    const [colorMode, setColorMode] = useState<'service' | 'status' | 'professional'>('professional');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalInitialData, setModalInitialData] = useState<any>(null);
    const [activeDetail, setActiveDetail] = useState<LegacyAppointment | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const appointmentRefs = useRef(new Map<number, HTMLDivElement | null>());
    const abortControllerRef = useRef<AbortController | null>(null);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        setToast({ message: String(message), type });
    }, []);

    // --- Busca de Dados ---
    const fetchAppointments = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        try {
            // 1. Profissionais
            const { data: profs } = await supabase.from('professionals').select('*').eq('active', true).order('display_order');
            const mappedProfs: LegacyProfessional[] = (profs || []).map(p => ({
                id: p.id, name: p.name, avatarUrl: p.photo_url, color: p.color || '#F97316'
            } as any));
            setProfessionals(mappedProfs);
            if (visibleProfIds.length === 0) setVisibleProfIds(mappedProfs.map(p => p.id));

            // 2. Agendamentos
            const tStart = startOfDay(currentDate).toISOString();
            const tEnd = endOfDay(currentDate).toISOString();

            const { data: apps, error } = await supabase.from('appointments').select('*').gte('date', tStart).lte('date', tEnd).abortSignal(controller.signal);
            if (error) throw error;

            const mappedApps: LegacyAppointment[] = (apps || []).map(row => ({
                id: row.id,
                start: new Date(row.date),
                end: row.end_date ? new Date(row.end_date) : new Date(new Date(row.date).getTime() + 30 * 60000),
                status: row.status as AppointmentStatus,
                client: { id: 0, nome: row.client_name, consent: true },
                professional: mappedProfs.find(p => p.id === Number(row.resource_id)) || { id: Number(row.resource_id), name: row.professional_name },
                service: { name: row.service_name, price: parseFloat(row.value), duration: 30, color: row.color },
                origem: row.origem
            } as any));

            setAppointments(mappedApps);
        } catch (e: any) {
            if (e.name !== 'AbortError') setFetchError(e.message);
        } finally {
            if (!controller.signal.aborted) setIsLoading(false);
        }
    }, [currentDate, visibleProfIds.length]);

    useEffect(() => {
        fetchAppointments();
        return () => abortControllerRef.current?.abort();
    }, [fetchAppointments]);

    const currentColWidth = useMemo(() => isAutoWidth ? (window.innerWidth < 1024 ? 180 : 220) : manualColWidth, [isAutoWidth, manualColWidth]);
    
    const timeSlots = useMemo(() => {
        const slots = [];
        for (let h = START_HOUR; h < END_HOUR; h++) {
            for (let m = 0; m < 60; m += intervalMin) slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
        return slots;
    }, [intervalMin]);

    const handleOpenModal = (prof?: LegacyProfessional, time?: string) => {
        let start = new Date(currentDate);
        if (time) {
            const [h, m] = time.split(':').map(Number);
            start.setHours(h, m, 0, 0);
        } else {
            start.setHours(9, 0, 0, 0);
        }
        setModalInitialData({ professional: prof || professionals[0], start });
        setIsModalOpen(true);
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans select-none relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* SIDEBAR */}
            <aside className={`hidden lg:flex bg-white border-r border-slate-200 flex-col flex-shrink-0 z-40 transition-all duration-300 ${isSidebarCollapsed ? 'w-0' : 'w-72'}`}>
                {!isSidebarCollapsed && (
                    <div className="p-6 overflow-y-auto scrollbar-hide space-y-8">
                        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Auto-Largura</span>
                                <ToggleSwitch on={isAutoWidth} onClick={() => setIsAutoWidth(!isAutoWidth)} />
                            </div>
                            {!isAutoWidth && <input type="range" min="150" max="400" value={manualColWidth} onChange={e => setManualColWidth(Number(e.target.value))} className="w-full h-1.5 accent-orange-500" />}
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><UserIcon size={14} /> Equipe</label>
                            {professionals.map(p => (
                                <label key={p.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl cursor-pointer">
                                    <input type="checkbox" checked={visibleProfIds.includes(p.id)} onChange={() => setVisibleProfIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])} className="w-5 h-5 rounded-lg text-orange-500" />
                                    <span className="text-xs font-bold text-slate-700">{p.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="absolute top-6 left-full ml-4 p-3 bg-white shadow-xl rounded-2xl text-orange-600 z-50">
                    {isSidebarCollapsed ? <PanelLeftOpen size={24} /> : <PanelLeftClose size={24} />}
                </button>
            </aside>

            {/* CONTEÚDO */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-30">
                    <div className="flex items-center bg-slate-50 p-1.5 rounded-[22px] border border-slate-100">
                        <button onClick={() => setCurrentDate(prev => addDays(prev, -1))} className="p-2 hover:bg-white rounded-xl text-slate-400"><ChevronLeft size={20} /></button>
                        <div className="flex flex-col items-center min-w-[160px]">
                            <span className="text-[11px] font-black text-slate-800 capitalize leading-none">{format(currentDate, "EEEE", { locale: pt })}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{format(currentDate, "dd 'de' MMMM", { locale: pt })}</span>
                        </div>
                        <button onClick={() => setCurrentDate(prev => addDays(prev, 1))} className="p-2 hover:bg-white rounded-xl text-slate-400"><ChevronRight size={20} /></button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={fetchAppointments} className="p-3 text-slate-400 hover:text-orange-600 transition-all"><RefreshCw size={22} className={isLoading ? 'animate-spin' : ''} /></button>
                        <button onClick={() => handleOpenModal()} className="bg-slate-900 hover:bg-black text-white font-black text-xs px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-2 transition-all active:scale-95">
                            <Plus size={22} /> <span className="uppercase tracking-widest">Agendar</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-auto scrollbar-hide bg-slate-50 relative">
                    {isLoading && <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={40} /></div>}
                    
                    <div className="inline-grid min-w-full" style={{ gridTemplateColumns: `60px repeat(${visibleProfIds.length}, ${currentColWidth}px)` }}>
                        <div className="sticky top-0 z-40 bg-white/80 h-20 border-b border-slate-200"></div>
                        {professionals.filter(p => visibleProfIds.includes(p.id)).map(prof => (
                            <div key={prof.id} className="sticky top-0 z-40 bg-white/80 border-b border-r border-slate-200 h-20 flex items-center justify-center p-2">
                                <div className="bg-white px-3 py-2 rounded-2xl border border-slate-100 shadow-sm w-full text-center">
                                    <span className="text-[10px] font-black text-slate-800 uppercase truncate block">{prof.name.split(' ')[0]}</span>
                                </div>
                            </div>
                        ))}

                        <div className="border-r border-slate-200 bg-white/50">
                            {timeSlots.map(time => (
                                <div key={time} className="text-right pr-3 text-[10px] font-black text-slate-500 border-b border-slate-100/30 border-dashed" style={{ height: `${(intervalMin / 60) * BASE_ROW_HEIGHT}px` }}>
                                    {time.endsWith(':00') && time}
                                </div>
                            ))}
                        </div>

                        {professionals.filter(p => visibleProfIds.includes(p.id)).map(prof => (
                            <div key={prof.id} className="relative border-r border-slate-100 min-h-full">
                                {timeSlots.map(time => (
                                    <div key={time} onClick={() => handleOpenModal(prof, time)} className="border-b border-slate-100/20 border-dashed cursor-cell hover:bg-orange-50/30 transition-colors" style={{ height: `${(intervalMin / 60) * BASE_ROW_HEIGHT}px` }}></div>
                                ))}

                                {appointments.filter(app => Number(app.professional.id) === prof.id).map(app => {
                                    const startMins = app.start.getHours() * 60 + app.start.getMinutes();
                                    const top = (startMins - START_HOUR * 60) * (BASE_ROW_HEIGHT / 60);
                                    return (
                                        <div
                                            key={app.id}
                                            ref={(el) => appointmentRefs.current.set(app.id, el)}
                                            onClick={(e) => { e.stopPropagation(); setActiveDetail(app); }}
                                            className="absolute left-1/2 -translate-x-1/2 w-[95%] rounded-2xl shadow-lg p-2.5 cursor-pointer z-10 text-white font-black text-[10px] uppercase border border-white/20"
                                            style={{ top: `${top}px`, height: '78px', backgroundColor: prof.color }}
                                        >
                                            <p className="truncate">{app.client?.nome}</p>
                                            <p className="opacity-80 font-bold mt-1 truncate">{app.service.name}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* MODAIS */}
            <NewAppointmentModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={fetchAppointments} 
                initialData={modalInitialData}
            />

            {activeDetail && (
                <AppointmentDetailPopover 
                    appointment={activeDetail} 
                    targetElement={appointmentRefs.current.get(activeDetail.id) || null} 
                    onClose={() => setActiveDetail(null)} 
                    onEdit={() => {}} 
                    onDelete={async (id) => { 
                        await supabase.from('appointments').delete().eq('id', id); 
                        fetchAppointments(); 
                        setActiveDetail(null); 
                    }} 
                    onUpdateStatus={async (id, status) => { 
                        await supabase.from('appointments').update({ status }).eq('id', id); 
                        fetchAppointments(); 
                        setActiveDetail(null); 
                    }} 
                />
            )}
        </div>
    );
};

export default AtendimentosView;
