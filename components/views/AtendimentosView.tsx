
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
    ChevronLeft, ChevronRight, MessageSquare, 
    ChevronDown, RefreshCw, Calendar as CalendarIcon,
    Maximize2, LayoutGrid, PlayCircle, CreditCard, Check, SlidersHorizontal, X, AlertTriangle,
    Ban, ShoppingBag, Plus
} from 'lucide-react';
import { format, addDays, addMinutes, startOfWeek, endOfWeek, parseISO, isSameDay } from 'date-fns';
import { ptBR as pt } from 'date-fns/locale/pt-BR';

import { LegacyAppointment, AppointmentStatus, FinancialTransaction, LegacyProfessional } from '../../types';
import AppointmentModal from '../modals/AppointmentModal';
import BlockTimeModal from '../modals/BlockTimeModal';
import NewTransactionModal from '../modals/NewTransactionModal';
import JaciBotPanel from '../JaciBotPanel';
import AppointmentDetailPopover from '../shared/AppointmentDetailPopover';
import Toast, { ToastType } from '../shared/Toast';
import { supabase } from '../../services/supabaseClient';

const START_HOUR = 8;
const END_HOUR = 20; 
const PIXELS_PER_MINUTE = 80 / 60; 

const getAppointmentPosition = (isoDateString: string, duration: number) => {
    const timePart = isoDateString.split('T')[1] || "00:00:00";
    const [hours, minutes] = timePart.split(':').map(Number);
    const appointmentMinutes = (hours * 60) + minutes;
    const startDayMinutes = START_HOUR * 60;
    const top = Math.max(0, (appointmentMinutes - startDayMinutes) * PIXELS_PER_MINUTE);
    const height = duration * PIXELS_PER_MINUTE;
    return { top: `${top}px`, height: `${height - 2}px` };
};

const getCardStyle = (app: LegacyAppointment, viewMode: 'profissional' | 'andamento' | 'pagamento') => {
    const baseClasses = "absolute left-0 right-0 mx-1 rounded-md shadow-sm border-l-4 p-1 cursor-grab active:cursor-grabbing z-10 hover:brightness-95 transition-all overflow-hidden flex flex-col gap-0";
    
    if (viewMode === 'pagamento') {
        const isPaid = app.status === 'concluido'; 
        if (isPaid) return `${baseClasses} bg-emerald-50 border-emerald-500 text-emerald-900`;
        return `${baseClasses} bg-rose-50 border-rose-500 text-rose-900`;
    }

    if (viewMode === 'andamento') {
        switch (app.status) {
            case 'concluido': return `${baseClasses} bg-green-100 border-green-600 text-green-900`;
            case 'cancelado': return `${baseClasses} bg-red-100 border-red-600 text-red-900 opacity-60`;
            case 'faltou': return `${baseClasses} bg-orange-100 border-orange-600 text-orange-900`;
            case 'confirmado':
            case 'confirmado_whatsapp': return `${baseClasses} bg-blue-100 border-blue-600 text-blue-900`;
            case 'em_atendimento': return `${baseClasses} bg-indigo-100 border-indigo-600 text-indigo-900 animate-pulse`;
            default: return `${baseClasses} bg-slate-100 border-slate-400 text-slate-700`;
        }
    }

    switch (app.status) {
        case 'concluido': return `${baseClasses} bg-green-50 border-green-500 text-green-900`;
        case 'bloqueado': return `${baseClasses} bg-slate-100 border-slate-500 text-slate-500 opacity-80`;
        case 'confirmado': return `${baseClasses} bg-cyan-50 border-cyan-500 text-cyan-900`;
        case 'confirmado_whatsapp': return `${baseClasses} bg-teal-50 border-teal-500 text-teal-900`;
        case 'chegou': return `${baseClasses} bg-purple-50 border-purple-500 text-purple-900`;
        case 'em_atendimento': return `${baseClasses} bg-indigo-50 border-indigo-500 text-indigo-900 animate-pulse`;
        case 'faltou': return `${baseClasses} bg-orange-50 border-orange-500 text-orange-900`;
        case 'cancelado': return `${baseClasses} bg-rose-50 border-rose-500 text-rose-800 opacity-60`;
        default: return `${baseClasses} bg-blue-50 border-blue-500 text-blue-900`;
    }
}

const TimelineIndicator = () => {
    const [topPosition, setTopPosition] = useState(0);
    useEffect(() => {
        const calculatePosition = () => {
            const now = new Date();
            const startOfDayMinutes = START_HOUR * 60;
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            if (nowMinutes < startOfDayMinutes || nowMinutes > END_HOUR * 60) {
                setTopPosition(-1); return;
            }
            const top = (nowMinutes - startOfDayMinutes) * PIXELS_PER_MINUTE;
            setTopPosition(top);
        };
        calculatePosition();
        const intervalId = setInterval(calculatePosition, 60000); 
        return () => clearInterval(intervalId);
    }, []);
    if (topPosition < 0) return null;
    return (
        <div className="absolute w-full z-10 pointer-events-none" style={{ top: `${topPosition}px` }}>
            <div className="h-px bg-red-500 w-full relative">
                <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm"></div>
            </div>
        </div>
    );
};

interface AtendimentosViewProps {
    onAddTransaction: (t: FinancialTransaction) => void;
}

type PeriodType = 'Dia' | 'Semana' | 'Mês' | 'Lista';
type ViewMode = 'profissional' | 'andamento' | 'pagamento';

const AtendimentosView: React.FC<AtendimentosViewProps> = ({ onAddTransaction }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState<(LegacyAppointment & { rawDate: string })[]>([]);
    const [resources, setResources] = useState<LegacyProfessional[]>([]);
    const [orderedProfessionals, setOrderedProfessionals] = useState<LegacyProfessional[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [periodType, setPeriodType] = useState<PeriodType>('Dia');
    const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
    const [modalState, setModalState] = useState<{ type: 'appointment' | 'block' | 'sale'; data: any } | null>(null);
    const [activeAppointmentDetail, setActiveAppointmentDetail] = useState<LegacyAppointment | null>(null);
    const [isJaciBotOpen, setIsJaciBotOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, time: Date, professional: LegacyProfessional } | null>(null);

    const [viewMode, setViewMode] = useState<ViewMode>('profissional');
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [colWidth, setColWidth] = useState(220);
    const [isAutoWidth, setIsAutoWidth] = useState(false);
    const [timeSlot, setTimeSlot] = useState(30);

    const isMounted = useRef(true);
    const appointmentRefs = useRef(new Map<number, HTMLDivElement | null>());
    const abortControllerRef = useRef<AbortController | null>(null);

    // FIX: Função de refresh centralizada
    const refreshCalendar = useCallback(async () => {
        if (!isMounted.current) return;
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        setIsLoadingData(true);

        try {
            const { data, error: appError } = await supabase
                .from('appointments')
                .select('*')
                .abortSignal(abortControllerRef.current.signal);
            
            if (appError) throw appError;
            
            if (data && isMounted.current) {
                const mapped = data.map(row => {
                    const start = parseISO(row.date);
                    const dur = row.duration || 30;
                    return {
                        id: row.id,
                        rawDate: row.date,
                        start,
                        end: new Date(start.getTime() + dur * 60000),
                        status: row.status as AppointmentStatus,
                        notas: row.notes || '',
                        client: { id: 0, nome: row.client_name || 'Bloqueado', consent: true },
                        professional: resources.find(p => p.id === Number(row.resource_id)) || { id: 0, name: row.professional_name, avatarUrl: '' },
                        service: { id: 0, name: row.service_name, price: Number(row.value), duration: dur, color: row.status === 'bloqueado' ? '#64748b' : '#3b82f6' }
                    } as LegacyAppointment & { rawDate: string };
                });
                setAppointments(mapped);
            }
        } catch (e: any) {
            if (isMounted.current && e.name !== 'AbortError') {
                console.error("Fetch error:", e);
                setError(e.message || "Erro ao conectar com a agenda.");
            }
        } finally { if (isMounted.current) setIsLoadingData(false); }
    }, [resources]);

    const fetchResources = async () => {
        if (!isMounted.current) return;
        try {
            const { data, error: resError } = await supabase
                .from('professionals')
                .select('id, name, photo_url, role, order_index')
                .order('order_index', { ascending: true });

            if (resError) throw resError;
            if (data && isMounted.current) {
                const mapped = data.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    avatarUrl: p.photo_url || `https://ui-avatars.com/api/?name=${p.name}&background=random`,
                    role: p.role,
                    order_index: p.order_index
                }));
                setResources(mapped);
                setOrderedProfessionals(mapped);
            }
        } catch (e: any) { 
            console.error("Erro ao carregar profissionais:", e);
        }
    };

    useEffect(() => {
        isMounted.current = true;
        fetchResources();
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (resources.length > 0) {
            refreshCalendar();
        }
    }, [resources, currentDate, refreshCalendar]);

    const timeSlotsLabels = useMemo(() => {
        const labels = [];
        const totalMinutes = (END_HOUR - START_HOUR) * 60;
        const slotsCount = totalMinutes / timeSlot;
        for (let i = 0; i < slotsCount; i++) {
            const minutesFromStart = i * timeSlot;
            const hour = START_HOUR + Math.floor(minutesFromStart / 60);
            const min = minutesFromStart % 60;
            labels.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
        }
        return labels;
    }, [timeSlot]);

    const handleGridAction = (e: React.MouseEvent, professional: LegacyProfessional, colDate?: Date) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const minutes = (offsetY / PIXELS_PER_MINUTE);
        const totalMinutesFromDayStart = (START_HOUR * 60) + minutes;
        const roundedMinutes = Math.round(totalMinutesFromDayStart / 15) * 15;
        const targetDate = new Date(colDate || currentDate);
        targetDate.setHours(Math.floor(roundedMinutes / 60), roundedMinutes % 60, 0, 0);
        
        setSelectionMenu({ x: e.clientX, y: e.clientY, time: targetDate, professional });
    };

    const handleDragStart = (e: React.DragEvent, app: LegacyAppointment) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ appointmentId: app.id }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = async (e: React.DragEvent, professional: LegacyProfessional, colDate?: Date) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('application/json');
        if (!data) return;
        
        const { appointmentId } = JSON.parse(data);
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const minutes = (offsetY / PIXELS_PER_MINUTE);
        const totalMinutesFromDayStart = (START_HOUR * 60) + minutes;
        const roundedMinutes = Math.round(totalMinutesFromDayStart / 15) * 15;
        
        const newStart = new Date(colDate || currentDate);
        newStart.setHours(Math.floor(roundedMinutes / 60), roundedMinutes % 60, 0, 0);

        try {
            const { error } = await supabase
                .from('appointments')
                .update({ 
                    resource_id: professional.id, 
                    professional_name: professional.name,
                    date: newStart.toISOString() 
                })
                .eq('id', appointmentId);
            
            if (error) throw error;
            setToast({ message: "Agendamento movido!", type: 'success' });
            refreshCalendar();
        } catch (err: any) {
            setToast({ message: `Erro ao mover: ${err.message}`, type: 'error' });
        }
    };

    // Lógica para Venda Rápida
    const handleQuickSale = (time: Date) => {
        setModalState({ type: 'sale', data: { date: time } });
        setSelectionMenu(null);
        // Opcionalmente redirecionar ou mostrar toast
        // setToast({ message: "Iniciando venda rápida...", type: 'info' });
    };

    return (
        <div className="flex h-full bg-white relative flex-col font-sans text-left overflow-hidden">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <header className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 z-30 shadow-sm">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            Agenda {isLoadingData && <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />}
                        </h2>
                        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button onClick={() => setViewMode('profissional')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'profissional' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid size={14} /> Equipe</button>
                            <button onClick={() => setViewMode('andamento')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'andamento' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}><PlayCircle size={14} /> Andamento</button>
                            <button onClick={() => setViewMode('pagamento')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'pagamento' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}><CreditCard size={14} /> Pagamento</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                        <button onClick={() => setIsConfigModalOpen(true)} className="p-2 rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 transition-all"><SlidersHorizontal size={20} /></button>
                        <button onClick={() => setIsPeriodModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">{periodType} <ChevronDown size={16} /></button>
                        <button onClick={() => setModalState({ type: 'appointment', data: { start: currentDate } })} className="bg-orange-500 hover:bg-orange-600 text-white font-black py-2 px-6 rounded-xl shadow-lg transition-all active:scale-95">Agendar</button>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentDate(new Date())} className="text-sm font-bold bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors">HOJE</button>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentDate(prev => addDays(prev, -1))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft size={20} /></button>
                        <button onClick={() => setCurrentDate(prev => addDays(prev, 1))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight size={20} /></button>
                    </div>
                    <span className="text-orange-500 font-bold text-lg capitalize tracking-tight">{format(currentDate, "EEE, dd 'de' MMMM", { locale: pt }).replace('.', '')}</span>
                </div>
            </header>

            <div className="flex-1 overflow-auto bg-slate-50 relative custom-scrollbar">
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-12 text-center bg-white/50 backdrop-blur-sm">
                        <AlertTriangle size={64} className="text-rose-500 mb-6" />
                        <h3 className="text-xl font-black text-slate-800 mb-2">Erro de Sincronização</h3>
                        <p className="max-w-md text-sm text-slate-500 mb-8">{error}</p>
                        <button onClick={refreshCalendar} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black shadow-lg flex items-center gap-2 hover:bg-black transition-all active:scale-95"><RefreshCw size={20}/> Tentar Novamente</button>
                    </div>
                ) : (
                    <div className="min-w-fit">
                        <div className="grid sticky top-0 z-40 border-b border-slate-200 bg-white" style={{ gridTemplateColumns: `60px repeat(${orderedProfessionals.length}, minmax(${isAutoWidth ? '180px' : colWidth + 'px'}, 1fr))` }}>
                            <div className="sticky left-0 z-50 bg-white border-r border-slate-200 h-24 min-w-[60px] flex items-center justify-center shadow-[4px_0_24px_rgba(0,0,0,0.05)]">
                                <Maximize2 size={16} className="text-slate-300" />
                            </div>
                            {orderedProfessionals.map((prof) => (
                                <div key={prof.id} className="flex flex-col items-center justify-center p-2 border-r border-slate-100 h-24 bg-slate-50/10 transition-colors hover:bg-slate-50">
                                    <img src={prof.avatarUrl} alt="" className="w-10 h-10 rounded-full border border-orange-100 object-cover mb-2 shadow-sm" />
                                    <span className="text-[11px] font-black text-slate-800 leading-tight truncate">{prof.name}</span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase truncate">{prof.role || 'Colaborador'}</span>
                                </div>
                            ))}
                        </div>

                        <div className="grid relative" style={{ gridTemplateColumns: `60px repeat(${orderedProfessionals.length}, minmax(${isAutoWidth ? '180px' : colWidth + 'px'}, 1fr))` }}>
                            <div className="sticky left-0 z-20 bg-white border-r border-slate-200 min-w-[60px] shadow-[4px_0_24px_rgba(0,0,0,0.05)]">
                                {timeSlotsLabels.map(time => (
                                    <div key={time} className="h-20 text-right pr-3 text-[10px] text-slate-400 font-black pt-2 border-b border-slate-100/50 border-dashed bg-white">
                                        <span>{time}</span>
                                    </div>
                                ))}
                            </div>
                            
                            {orderedProfessionals.map((prof, idx) => (
                                <div 
                                    key={prof.id} 
                                    className={`relative border-r border-slate-200 min-h-[1000px] ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/[0.03]'}`}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDrop(e, prof)}
                                    onClick={(e) => {
                                        if (e.target === e.currentTarget) handleGridAction(e, prof);
                                    }}
                                >
                                    {timeSlotsLabels.map((_, i) => <div key={i} className="h-20 border-b border-slate-100/50 border-dashed pointer-events-none"></div>)}
                                    {appointments.filter(app => Number(app.professional.id) === prof.id).map(app => {
                                        const pos = getAppointmentPosition(app.rawDate, app.service.duration);
                                        return (
                                            <div
                                                key={app.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, app)}
                                                ref={(el) => { if (el) appointmentRefs.current.set(app.id, el); }}
                                                onClick={(e) => { e.stopPropagation(); setActiveAppointmentDetail(app); }}
                                                className={getCardStyle(app, viewMode)}
                                                style={{ ...pos }}
                                            >
                                                <div className="flex flex-col h-full w-full overflow-hidden">
                                                    <span className="text-[9px] font-mono text-slate-500 leading-none mb-0.5">{format(app.start, 'HH:mm')}</span>
                                                    <span className="text-xs font-bold text-slate-900 leading-tight truncate">{app.client?.nome || 'Bloqueado'}</span>
                                                    <span className="text-[10px] text-slate-600 leading-none truncate mt-0.5">{app.service.name}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                            <TimelineIndicator />
                        </div>
                    </div>
                )}
            </div>

            {/* Selection Menu (Action Popover) */}
            {selectionMenu && (
                <>
                    <div className="fixed inset-0 z-50" onClick={() => setSelectionMenu(null)} />
                    <div 
                        className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 w-64 py-2 animate-in fade-in zoom-in-95 duration-150 overflow-hidden" 
                        style={{ 
                            top: Math.min(selectionMenu.y, window.innerHeight - 200), 
                            left: Math.min(selectionMenu.x, window.innerWidth - 260) 
                        }}
                    >
                        <div className="px-4 py-2 bg-slate-50 border-b mb-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Ações para {format(selectionMenu.time, 'HH:mm')}</p>
                        </div>
                        <button 
                            onClick={() => { setModalState({ type: 'appointment', data: { start: selectionMenu.time, professional: selectionMenu.professional } }); setSelectionMenu(null); }} 
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                        >
                            <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600"><CalendarIcon size={16} /></div> Novo Agendamento
                        </button>
                        <button 
                            onClick={() => { setModalState({ type: 'block', data: { start: selectionMenu.time, professional: selectionMenu.professional } }); setSelectionMenu(null); }} 
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                            <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600"><Ban size={16} /></div> Bloquear Horário
                        </button>
                        <button 
                            onClick={() => handleQuickSale(selectionMenu.time)} 
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                        >
                            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600"><ShoppingBag size={16} /></div> Venda Rápida
                        </button>
                    </div>
                </>
            )}

            {isConfigModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsConfigModalOpen(false)}></div>
                    <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden">
                        <header className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-extrabold text-slate-800">Aparência da Grade</h3>
                            <button onClick={() => setIsConfigModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
                        </header>
                        <div className="p-8 space-y-4">
                            <div className="flex justify-between items-center"><label className="text-sm font-black text-slate-700 uppercase">Largura Coluna</label><span className="text-xs font-bold">{colWidth}px</span></div>
                            <input type="range" min="150" max="450" step="10" value={colWidth} onChange={e => setColWidth(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                        </div>
                        <footer className="p-6 bg-slate-50 flex justify-end"><button onClick={() => setIsConfigModalOpen(false)} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-2xl">Fechar</button></footer>
                    </div>
                </div>
            )}

            {activeAppointmentDetail && (
                <AppointmentDetailPopover 
                    appointment={activeAppointmentDetail} 
                    targetElement={appointmentRefs.current.get(activeAppointmentDetail.id) || null} 
                    onClose={() => setActiveAppointmentDetail(null)} 
                    onEdit={(app) => setModalState({ type: 'appointment', data: app })} 
                    onDelete={async (id) => { 
                        try {
                            const { error: delError } = await supabase.from('appointments').delete().eq('id', id); 
                            if (delError) throw delError;
                            setToast({ message: "Agendamento excluído!", type: 'info' });
                            refreshCalendar();
                            setActiveAppointmentDetail(null);
                        } catch (e: any) { alert(e.message); }
                    }} 
                    onUpdateStatus={async (id, status) => { 
                        try {
                            const { error: upError } = await supabase.from('appointments').update({ status }).eq('id', id); 
                            if (upError) throw upError;
                            setToast({ message: "Status atualizado!", type: 'success' });
                            refreshCalendar();
                            setActiveAppointmentDetail(null); 
                        } catch (e: any) { alert(e.message); }
                    }} 
                />
            )}

            {modalState?.type === 'appointment' && (
                <AppointmentModal 
                    appointment={modalState.data} 
                    onClose={() => setModalState(null)} 
                    onSave={async (app) => {
                        try {
                            const payload = {
                                client_name: app.client?.nome, resource_id: app.professional.id, professional_name: app.professional.name,
                                service_name: app.service.name, value: app.service.price, duration: app.service.duration,
                                date: app.start.toISOString(), status: app.status, notes: app.notas, origem: 'interno'
                            };
                            if (app.id) {
                                await supabase.from('appointments').update(payload).eq('id', app.id);
                            } else {
                                await supabase.from('appointments').insert([payload]);
                            }
                            setToast({ message: "Agenda atualizada com sucesso!", type: 'success' });
                            setModalState(null);
                            refreshCalendar();
                        } catch (e: any) { alert(e.message); }
                    }} 
                />
            )}

            {modalState?.type === 'block' && (
                <BlockTimeModal 
                    professional={modalState.data.professional} 
                    startTime={modalState.data.start} 
                    onClose={() => setModalState(null)} 
                    onSave={async (block) => {
                        try {
                            const payload = {
                                resource_id: block.professional.id, professional_name: block.professional.name, service_name: 'Bloqueio de Agenda',
                                value: 0, duration: block.service.duration, date: block.start.toISOString(), status: 'bloqueado', notes: block.notas, origem: 'interno'
                            };
                            await supabase.from('appointments').insert([payload]);
                            setToast({ message: "Horário bloqueado com sucesso!", type: 'info' });
                            setModalState(null);
                            refreshCalendar();
                        } catch (e: any) { alert(e.message); }
                    }} 
                />
            )}

            {modalState?.type === 'sale' && (
                <NewTransactionModal 
                    type="receita"
                    onClose={() => setModalState(null)}
                    onSave={(t) => { 
                        onAddTransaction(t); 
                        setModalState(null); 
                        setToast({ message: 'Venda registrada!', type: 'success' }); 
                        refreshCalendar(); 
                    }}
                />
            )}
            
            <JaciBotPanel isOpen={isJaciBotOpen} onClose={() => setIsJaciBotOpen(false)} />
        </div>
    );
};

export default AtendimentosView;
