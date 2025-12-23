
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
    ChevronLeft, ChevronRight, Plus, RefreshCw, 
    User as UserIcon, Settings, Bell, Calendar,
    X, Lock, Clock, PanelLeftClose, PanelLeftOpen, Maximize2,
    Palette, AlertTriangle, Loader2, Globe, MessageSquare,
    Minus, Search, ThumbsUp, ArrowRight
} from 'lucide-react';
import { format, addDays, startOfDay, endOfDay, isSameDay, addMinutes } from 'date-fns';
import { pt } from 'date-fns/locale';

import { LegacyAppointment, AppointmentStatus, LegacyProfessional } from '../../types';
import NewAppointmentModal from '../modals/NewAppointmentModal';
import AppointmentDetailPopover from '../shared/AppointmentDetailPopover';
import Toast, { ToastType } from '../shared/Toast';
import { supabase } from '../../services/supabaseClient';

const START_HOUR = 8;
const END_HOUR = 21; 

// --- Estilos de Status (Fiel às Imagens) ---
const statusClasses: { [key in AppointmentStatus]: string } = {
    confirmado: 'bg-blue-50 border-blue-200 text-blue-800 border-l-blue-500',
    confirmado_whatsapp: 'bg-teal-50 border-teal-200 text-teal-800 border-l-teal-500',
    agendado: 'bg-amber-50 border-amber-200 text-amber-800 border-l-amber-500',
    chegou: 'bg-purple-50 border-purple-200 text-purple-800 border-l-purple-500',
    concluido: 'bg-emerald-50 border-emerald-200 text-emerald-800 border-l-emerald-500',
    cancelado: 'bg-slate-100 border-slate-200 text-slate-400 line-through border-l-slate-400 opacity-60',
    bloqueado: 'bg-slate-200 border-slate-300 text-slate-600 pattern-diagonal-lines-sm opacity-50 border-l-slate-500',
    faltou: 'bg-rose-50 border-rose-200 text-rose-800 border-l-rose-500',
    em_atendimento: 'bg-indigo-50 border-indigo-200 text-indigo-800 border-l-indigo-500 ring-1 ring-indigo-200 animate-pulse',
    em_espera: 'bg-slate-50 border-slate-200 text-slate-600 border-l-slate-400',
};

// --- Linha do Tempo em Tempo Real ---
const TimelineIndicator = ({ rowHeight }: { rowHeight: number }) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const startMins = START_HOUR * 60;
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    if (currentMins < startMins || currentMins > END_HOUR * 60) return null;

    const top = ((currentMins - startMins) / 30) * rowHeight;

    return (
        <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${top}px` }}>
            <div className="border-t-2 border-red-500 w-full relative">
                <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full shadow-sm ring-2 ring-white"></div>
            </div>
        </div>
    );
};

const AtendimentosView: React.FC = () => {
    // --- Estados de UI / Configuração (O Resgate) ---
    const [columnWidth, setColumnWidth] = useState(240);
    const [timeInterval, setTimeInterval] = useState(30);
    const [rowHeight, setRowHeight] = useState(60);

    // --- Estados de Dados ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState<LegacyAppointment[]>([]);
    const [professionals, setProfessionals] = useState<LegacyProfessional[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [visibleProfIds, setVisibleProfIds] = useState<number[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalInitialData, setModalInitialData] = useState<any>(null);
    const [activeDetail, setActiveDetail] = useState<LegacyAppointment | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const appointmentRefs = useRef(new Map<number, HTMLDivElement | null>());
    const abortControllerRef = useRef<AbortController | null>(null);

    // --- Busca de Dados ---
    const fetchData = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        try {
            const { data: profs, error: profError } = await supabase
                .from('professionals')
                .select('*')
                .eq('active', true)
                .order('display_order')
                .abortSignal(controller.signal);

            if (profError) throw profError;

            const mappedProfs: LegacyProfessional[] = (profs || []).map(p => ({
                id: p.id, 
                name: p.name, 
                avatarUrl: p.photo_url || `https://ui-avatars.com/api/?name=${p.name}&background=random`, 
                color: p.color || '#F97316'
            } as any));
            
            setProfessionals(mappedProfs);
            if (visibleProfIds.length === 0) setVisibleProfIds(mappedProfs.map(p => p.id));

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
            if (e.name === 'AbortError' || e.message?.includes('aborted')) return;
            console.error("Erro na agenda:", e);
        } finally {
            if (abortControllerRef.current === controller) {
                setIsLoading(false);
            }
        }
    }, [currentDate, visibleProfIds.length]);

    useEffect(() => {
        fetchData();
        return () => abortControllerRef.current?.abort();
    }, [fetchData]);

    const timeSlots = useMemo(() => {
        const slots = [];
        for (let h = START_HOUR; h < END_HOUR; h++) {
            slots.push(`${String(h).padStart(2, '0')}:00`);
            slots.push(`${String(h).padStart(2, '0')}:30`);
        }
        return slots;
    }, []);

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

    const filteredProfs = professionals.filter(p => visibleProfIds.includes(p.id));

    return (
        <div className="flex h-screen bg-white overflow-hidden font-sans select-none relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* SIDEBAR DE CONFIGURAÇÃO (O RESGATE) */}
            <aside className={`bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-40 transition-all duration-300 ${isSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-72'}`}>
                <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                    <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className="font-bold text-slate-700">Configurações</h2>
                </div>
                
                <div className="p-6 space-y-8 overflow-y-auto scrollbar-hide">
                    {/* Controles de Visualização */}
                    <div className="space-y-6">
                        <div>
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Largura das colunas</label>
                            <input 
                                type="range" 
                                min="150" 
                                max="400" 
                                value={columnWidth} 
                                onChange={(e) => setColumnWidth(Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-800"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Intervalo de tempo</label>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setTimeInterval(prev => Math.max(15, prev - 15))} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 border border-slate-200">
                                    <Minus size={16} />
                                </button>
                                <div className="flex-1 text-center font-bold text-slate-700 bg-slate-50 py-2 rounded-lg border border-slate-200">
                                    {timeInterval} min
                                </div>
                                <button onClick={() => setTimeInterval(prev => Math.min(60, prev + 15))} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 border border-slate-200">
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Lista de Profissionais com Checkbox Estilizado */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                             <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Profissionais</h3>
                             <button className="text-[10px] font-bold text-blue-600 hover:underline">Selecionar todos</button>
                        </div>
                        
                        <div className="space-y-1">
                            {professionals.map(p => (
                                <label key={p.id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all hover:bg-slate-50`}>
                                    <input 
                                        type="checkbox" 
                                        checked={visibleProfIds.includes(p.id)} 
                                        onChange={() => setVisibleProfIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])} 
                                        className="w-5 h-5 rounded border-slate-300 text-slate-800 focus:ring-slate-800" 
                                    />
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <img src={p.avatarUrl} className="w-8 h-8 rounded-full border border-white shadow-sm flex-shrink-0" alt="" />
                                        <span className="text-sm font-semibold text-slate-700 truncate">{p.name}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="mt-auto p-4 border-t border-slate-100">
                    <button onClick={() => setIsSidebarCollapsed(true)} className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 hover:text-slate-600 text-sm font-bold">
                        <PanelLeftClose size={18} /> Recolher painel
                    </button>
                </div>
            </aside>

            {/* CONTEÚDO PRINCIPAL (GRADE) */}
            <div className="flex-1 flex flex-col min-w-0 relative bg-slate-50">
                {isSidebarCollapsed && (
                    <button onClick={() => setIsSidebarCollapsed(false)} className="absolute top-6 left-6 p-3 bg-white shadow-xl rounded-2xl text-slate-800 z-50 hover:scale-110 transition-transform border border-slate-200">
                        <PanelLeftOpen size={24} />
                    </button>
                )}

                {/* Header Superior Estilizado */}
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-30 shadow-sm flex-shrink-0">
                    <div className="flex items-center gap-6">
                        <h1 className="text-xl font-bold text-slate-800">Agenda</h1>
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button onClick={() => setCurrentDate(prev => addDays(prev, -1))} className="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800 transition-all"><ChevronLeft size={20} /></button>
                            <div className="flex flex-col items-center min-w-[160px] px-2">
                                <span className="text-xs font-bold text-slate-800 capitalize leading-none">{format(currentDate, "EEEE, dd 'de' MMMM", { locale: pt })}</span>
                            </div>
                            <button onClick={() => setCurrentDate(prev => addDays(prev, 1))} className="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800 transition-all"><ChevronRight size={20} /></button>
                        </div>
                        <button className="flex items-center gap-2 text-blue-600 text-sm font-bold hover:underline">
                            {/* FIX: Use Calendar icon from lucide-react */}
                            <Calendar size={16}/> Ir para hoje
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="Buscar agendamento..." className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm w-64 focus:ring-2 focus:ring-slate-200 outline-none" />
                        </div>
                        <button onClick={fetchData} className="p-2.5 text-slate-400 hover:text-slate-800 transition-all bg-white border border-slate-200 rounded-xl"><RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} /></button>
                        <button onClick={() => handleOpenModal()} className="bg-slate-900 hover:bg-black text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95">
                            <Plus size={20} /> Agendar
                        </button>
                    </div>
                </header>

                {/* GRADE DA AGENDA COM HORIZONTAL SCROLL */}
                <div className="flex-1 overflow-auto relative scrollbar-hide">
                    {isLoading && <div className="sticky top-0 left-0 w-full h-1 bg-blue-500 animate-pulse z-50"></div>}
                    
                    <div className="inline-grid min-w-full" style={{ gridTemplateColumns: `80px repeat(${filteredProfs.length}, ${columnWidth}px)` }}>
                        {/* Header de Profissionais com Avatares (O Resgate) */}
                        <div className="sticky top-0 z-40 bg-white border-b border-r border-slate-200 h-20"></div>
                        {filteredProfs.map(prof => (
                            <div key={prof.id} className="sticky top-0 z-40 bg-white border-b border-r border-slate-200 h-20 flex items-center px-4 gap-3">
                                <div className="relative">
                                    <img src={prof.avatarUrl} className="w-12 h-12 rounded-full border-2 border-slate-100 shadow-sm object-cover" alt="" />
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div className="min-w-0">
                                    <span className="text-sm font-bold text-slate-800 truncate block leading-tight">{prof.name}</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Disponível</span>
                                </div>
                            </div>
                        ))}

                        {/* Coluna de Horários lateral */}
                        <div className="bg-white border-r border-slate-200 relative z-30">
                            {timeSlots.map(time => (
                                <div key={time} className="text-right pr-4 text-[11px] font-bold text-slate-400 border-b border-slate-100" style={{ height: `${rowHeight}px`, lineHeight: `${rowHeight}px` }}>
                                    {time.endsWith(':00') ? time : ''}
                                </div>
                            ))}
                        </div>

                        {/* Colunas de Atendimento com Cards Estilizados */}
                        {filteredProfs.map(prof => (
                            <div key={prof.id} className="relative border-r border-slate-100 bg-white/40">
                                <TimelineIndicator rowHeight={rowHeight} />
                                
                                {timeSlots.map(time => (
                                    <div 
                                        key={time} 
                                        onClick={() => handleOpenModal(prof, time)} 
                                        className="border-b border-slate-100/50 cursor-cell hover:bg-slate-100/50 transition-colors" 
                                        style={{ height: `${rowHeight}px` }}
                                    ></div>
                                ))}

                                {appointments.filter(app => Number(app.professional.id) === prof.id).map(app => {
                                    const startMins = app.start.getHours() * 60 + app.start.getMinutes();
                                    const endMins = app.end.getHours() * 60 + app.end.getMinutes();
                                    const top = ((startMins - START_HOUR * 60) / 30) * rowHeight;
                                    const height = ((endMins - startMins) / 30) * rowHeight;

                                    return (
                                        <div
                                            key={app.id}
                                            ref={(el) => appointmentRefs.current.set(app.id, el)}
                                            onClick={(e) => { e.stopPropagation(); setActiveDetail(app); }}
                                            className={`absolute left-1/2 -translate-x-1/2 w-[94%] rounded-xl shadow-sm p-3 cursor-pointer z-10 border-l-4 transition-all hover:shadow-md hover:z-20 ${statusClasses[app.status]}`}
                                            style={{ top: `${top + 2}px`, height: `${height - 4}px` }}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-[10px] font-bold opacity-70 uppercase truncate tracking-tighter">
                                                    {format(app.start, 'HH:mm')} - {format(app.end, 'HH:mm')}
                                                </p>
                                                {app.status === 'confirmado' && <ThumbsUp size={12} className="text-blue-500" />}
                                                {app.status === 'em_atendimento' && <ArrowRight size={12} className="text-indigo-500 animate-bounce-x" />}
                                            </div>
                                            <p className="text-xs font-black truncate leading-tight mb-0.5">{app.client?.nome}</p>
                                            <p className="text-[11px] opacity-80 truncate font-medium">{app.service.name}</p>
                                            
                                            {height > 80 && (
                                                <div className="mt-2 pt-2 border-t border-black/5 flex items-center gap-1">
                                                    {app.origem === 'link' && <Globe size={10} className="opacity-40" />}
                                                    <span className="text-[9px] font-bold opacity-40 uppercase">R$ {app.service.price.toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* MODAIS E POPOVERS */}
            <NewAppointmentModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={fetchData} 
                initialData={modalInitialData}
            />

            {activeDetail && (
                <AppointmentDetailPopover 
                    appointment={activeDetail} 
                    targetElement={appointmentRefs.current.get(activeDetail.id) || null} 
                    onClose={() => setActiveDetail(null)} 
                    onEdit={() => {}} 
                    onDelete={async (id) => { 
                        if(confirm("Deseja cancelar este agendamento?")){
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
