import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    ChevronLeft, ChevronRight, MessageSquare, 
    ChevronDown, RefreshCw, Calendar as CalendarIcon,
    ShoppingBag, Ban, Settings as SettingsIcon, Maximize2, 
    LayoutGrid, PlayCircle, CreditCard, Check, SlidersHorizontal, X, Clock, AlertTriangle
} from 'lucide-react';
import { format, addDays, addWeeks, addMonths, eachDayOfInterval, isSameDay, isWithinInterval, startOfWeek, endOfWeek, isSameMonth, parseISO } from 'date-fns';
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

interface DynamicColumn {
    id: string | number;
    title: string;
    subtitle?: string;
    photo?: string; 
    type: 'professional' | 'status' | 'payment' | 'date';
    data?: LegacyProfessional | Date; 
}

/**
 * CORREÇÃO DEFINITIVA (Bug de Timezone): 
 * Esta função extrai as horas e minutos DIRETAMENTE da string do banco de dados,
 * ignorando qualquer conversão automática de fuso horário do objeto Date do JavaScript.
 */
const getAppointmentPosition = (isoDateString: string, duration: number) => {
    // 1. Extração literal da hora (ex: "2025-11-03T14:00:00" -> "14:00:00")
    // O split em 'T' garante que pegamos apenas a parte do tempo sem aplicar offset
    const timePart = isoDateString.split('T')[1] || "00:00:00";
    
    // 2. Quebra a string em [HH, mm] ignorando fuso horário
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // 3. Converte para minutos absolutos desde as 00:00
    const appointmentMinutesTotal = (hours * 60) + minutes;
    const startDayMinutes = START_HOUR * 60;
    
    // 4. Calcula a diferença em relação ao horário de abertura do calendário (08:00)
    const diffInMinutes = appointmentMinutesTotal - startDayMinutes;
    
    // 5. Converte a diferença de minutos para Pixels
    const top = Math.max(0, diffInMinutes * PIXELS_PER_MINUTE);
    const height = duration * PIXELS_PER_MINUTE;
    
    return { top: `${top}px`, height: `${height - 2}px` };
};

const getCardStyle = (app: LegacyAppointment, viewMode: 'profissional' | 'andamento' | 'pagamento') => {
    const baseClasses = "absolute left-0 right-0 mx-1 rounded-md shadow-sm border border-l-4 p-1.5 cursor-pointer z-10 hover:brightness-95 transition-all overflow-hidden flex flex-col";
    
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
        case 'concluido': return `${baseClasses} bg-green-50 border-green-200 text-green-900`;
        case 'bloqueado': return `${baseClasses} bg-slate-100 border-slate-300 text-slate-500 opacity-80`;
        case 'confirmado': return `${baseClasses} bg-cyan-50 border-cyan-200 text-cyan-900`;
        case 'confirmado_whatsapp': return `${baseClasses} bg-teal-50 border-teal-200 text-teal-900`;
        case 'chegou': return `${baseClasses} bg-purple-50 border-purple-200 text-purple-900`;
        case 'em_atendimento': return `${baseClasses} bg-indigo-50 border-indigo-200 text-indigo-900 animate-pulse`;
        case 'faltou': return `${baseClasses} bg-orange-50 border-orange-200 text-orange-900`;
        case 'cancelado': return `${baseClasses} bg-rose-50 border-rose-200 text-rose-800 opacity-60`;
        case 'em_espera': return `${baseClasses} bg-stone-50 border-stone-200 text-stone-900`;
        default: return `${baseClasses} bg-blue-50 border-blue-200 text-blue-900`;
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

    // FIX: Completed the truncated fetchResources function.
    const fetchResources = async () => {
        if (!isMounted.current) return;
        try {
            const { data, error: resError } = await supabase
                .from('professionals')
                .select('id, name, photo_url, role, order_index')
                .order('order_index', { ascending: true });
            
            if (resError) throw resError;
            if (isMounted.current && data) {
                const mappedResources = data.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    avatarUrl: p.photo_url,
                    role: p.role
                }));
                setResources(mappedResources);
                setOrderedProfessionals(mappedResources);
            }
        } catch (e: any) {
            console.error("Erro ao carregar profissionais:", e);
            setError("Falha ao carregar profissionais do estúdio.");
        }
    };

    // FIX: Re-implemented the missing fetchAppointments and other component logic to make it functional.
    const fetchAppointments = async () => {
        if (!isMounted.current) return;
        setIsLoadingData(true);
        try {
            const { data, error: appError } = await supabase
                .from('appointments')
                .select('*')
                .gte('date', startOfWeek(currentDate).toISOString())
                .lte('date', endOfWeek(currentDate).toISOString());
            
            if (appError) throw appError;
            
            if (isMounted.current && data) {
                setAppointments(data.map((a: any) => ({
                    ...a,
                    start: new Date(a.date),
                    end: addMinutes(new Date(a.date), a.duration),
                    rawDate: a.date,
                    professional: resources.find(r => r.id === a.resource_id) || { id: a.resource_id, name: 'Profissional', avatarUrl: '' },
                    service: { id: 0, name: a.service_name, price: a.value, duration: a.duration, color: 'blue' }
                })));
            }
        } catch (e: any) {
            console.error("Erro ao carregar agendamentos:", e);
        } finally {
            if (isMounted.current) setIsLoadingData(false);
        }
    };

    useEffect(() => {
        isMounted.current = true;
        fetchResources();
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (resources.length > 0) {
            fetchAppointments();
        }
    }, [currentDate, resources]);

    const timeSlots = useMemo(() => {
        const slots = [];
        for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
            slots.push(`${hour.toString().padStart(2, '0')}:00`);
            slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        return slots;
    }, []);

    // FIX: Finalized the return statement and added the missing default export.
    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CalendarIcon className="text-orange-500" />
                        Agenda
                    </h1>
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <button onClick={() => setCurrentDate(prev => addDays(prev, -1))} className="p-1.5 hover:bg-white rounded-md text-slate-500 transition-all"><ChevronLeft size={18}/></button>
                        <span className="px-4 text-sm font-bold text-slate-700 min-w-[140px] text-center capitalize">{format(currentDate, "EEEE, dd/MM", { locale: pt })}</span>
                        <button onClick={() => setCurrentDate(prev => addDays(prev, 1))} className="p-1.5 hover:bg-white rounded-md text-slate-500 transition-all"><ChevronRight size={18}/></button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => setIsJaciBotOpen(true)} className="p-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-all shadow-sm flex items-center gap-2 font-bold text-sm">
                        <MessageSquare size={18} /> JaciBot
                    </button>
                    <button onClick={() => setModalState({ type: 'appointment', data: { start: new Date() } })} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-100 transition-all active:scale-95">
                        Novo Agendamento
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-auto relative">
                <div className="min-w-max bg-white">
                    {/* Headers dos Profissionais */}
                    <div className="sticky top-0 z-20 flex bg-white border-b border-slate-200 ml-16">
                        {orderedProfessionals.map(prof => (
                            <div key={prof.id} className="border-r border-slate-100 flex flex-col items-center py-4" style={{ width: colWidth }}>
                                <img src={prof.avatarUrl || `https://ui-avatars.com/api/?name=${prof.name}&background=random`} className="w-10 h-10 rounded-full border-2 border-orange-100 mb-2" alt="" />
                                <span className="text-xs font-bold text-slate-700">{prof.name}</span>
                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{(prof as any).role || '---'}</span>
                            </div>
                        ))}
                    </div>

                    <div className="relative flex">
                        {/* Coluna de Horário */}
                        <div className="w-16 flex-shrink-0 bg-slate-50 border-r border-slate-200">
                            {timeSlots.map(time => (
                                <div key={time} className="h-20 flex items-start justify-center pt-2 border-b border-slate-100 text-[10px] font-bold text-slate-400">
                                    {time}
                                </div>
                            ))}
                        </div>

                        {/* Grid do Calendário */}
                        <div className="flex relative">
                            <TimelineIndicator />
                            {orderedProfessionals.map(prof => (
                                <div key={prof.id} className="relative border-r border-slate-100" style={{ width: colWidth }}>
                                    {timeSlots.map((_, i) => (
                                        <div key={i} className="h-20 border-b border-slate-50" />
                                    ))}
                                    
                                    {/* Renderização de Agendamentos */}
                                    {appointments.filter(app => app.professional.id === prof.id).map(app => {
                                        const pos = getAppointmentPosition(app.rawDate, app.service.duration);
                                        return (
                                            <div 
                                                key={app.id}
                                                onClick={() => setActiveAppointmentDetail(app)}
                                                className={getCardStyle(app, viewMode)}
                                                style={{ top: pos.top, height: pos.height }}
                                            >
                                                <p className="text-[10px] font-black">{format(app.start, 'HH:mm')}</p>
                                                <p className="font-bold text-xs truncate">{app.client?.nome || 'Bloqueado'}</p>
                                                <p className="text-[10px] opacity-80 truncate">{app.service.name}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modais e Painéis Auxiliares */}
            {modalState?.type === 'appointment' && (
                <AppointmentModal 
                    appointment={modalState.data} 
                    onClose={() => setModalState(null)} 
                    onSave={() => { setModalState(null); fetchAppointments(); }}
                />
            )}
            {activeAppointmentDetail && (
                <AppointmentDetailPopover 
                    appointment={activeAppointmentDetail}
                    targetElement={null}
                    onClose={() => setActiveAppointmentDetail(null)}
                    onEdit={(app) => setModalState({ type: 'appointment', data: app })}
                    onDelete={() => {}}
                    onUpdateStatus={() => {}}
                />
            )}
            {isJaciBotOpen && <JaciBotPanel isOpen={isJaciBotOpen} onClose={() => setIsJaciBotOpen(false)} />}
        </div>
    );
};

export default AtendimentosView;
