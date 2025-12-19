
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { services as mockServicesMap } from '../../data/mockData';
import { LegacyAppointment, AppointmentStatus, FinancialTransaction, LegacyProfessional } from '../../types';
import { format, addDays, addWeeks, addMonths, eachDayOfInterval, isSameDay, isWithinInterval } from 'date-fns';
import { 
    ChevronLeft, ChevronRight, Plus, Lock, MessageSquare, 
    Share2, Bell, RotateCcw, ChevronDown, List, Clock, 
    CheckCircle, DollarSign, FileText, Calendar as CalendarIcon, RefreshCw, User as UserIcon
} from 'lucide-react';
import { pt } from 'date-fns/locale';

import AppointmentModal from '../modals/AppointmentModal';
import BlockTimeModal from '../modals/BlockTimeModal';
import ContextMenu from '../shared/ContextMenu';
import JaciBotPanel from '../JaciBotPanel';
import AppointmentDetailPopover from '../shared/AppointmentDetailPopover';
import Toast, { ToastType } from '../shared/Toast';
import { supabase } from '../../services/supabaseClient';

const START_HOUR = 8;
const END_HOUR = 20; 
const PIXELS_PER_MINUTE = 80 / 60; 

// --- Date Helper Functions ---

function setHours(date: Date, hours: number): Date {
    const d = new Date(date);
    d.setHours(hours);
    return d;
}

function setMinutes(date: Date, minutes: number): Date {
    const d = new Date(date);
    d.setMinutes(minutes);
    return d;
}

function startOfWeek(date: Date, options?: { weekStartsOn?: number }): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day < (options?.weekStartsOn || 0) ? 7 : 0) + day - (options?.weekStartsOn || 0);
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfWeek(date: Date, options?: { weekStartsOn?: number }): Date {
    const start = startOfWeek(date, options);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
}

function startOfMonth(date: Date): Date {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfMonth(date: Date): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    d.setHours(23, 59, 59, 999);
    return d;
}

function roundToNearestMinutes(date: Date, options?: { nearestTo?: number }): Date {
    const d = new Date(date);
    const minutes = d.getMinutes();
    const nearestTo = options?.nearestTo || 1;
    const roundedMinutes = Math.round(minutes / nearestTo) * nearestTo;
    d.setMinutes(roundedMinutes);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
}

// --- Interfaces for Dynamic Columns ---

interface DynamicColumn {
    id: string | number;
    title: string;
    subtitle?: string;
    photo?: string; 
    type: 'professional' | 'status' | 'payment' | 'date';
    data?: any; 
}

// --- Helper Functions ---

const getAppointmentStyle = (start: Date, end: Date) => {
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const top = (startMinutes - START_HOUR * 60) * PIXELS_PER_MINUTE;
    const height = (endMinutes - startMinutes) * PIXELS_PER_MINUTE;
    return { top: `${top}px`, height: `${height - 4}px` };
};

const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
        case 'concluido': return 'bg-green-100 border-green-300 text-green-800 hover:ring-green-400';
        case 'bloqueado': return 'bg-slate-200 border-slate-300 text-slate-700 hover:ring-slate-400 pattern-diagonal-lines-sm pattern-slate-400 pattern-bg-slate-200 pattern-size-4 pattern-opacity-100';
        case 'confirmado': return 'bg-cyan-100 border-cyan-300 text-cyan-800 hover:ring-cyan-400';
        case 'confirmado_whatsapp': return 'bg-teal-100 border-teal-300 text-teal-800 hover:ring-teal-400';
        case 'chegou': return 'bg-purple-100 border-purple-300 text-purple-800 hover:ring-purple-400';
        case 'em_atendimento': return 'bg-indigo-100 border-indigo-300 text-indigo-800 hover:ring-indigo-400 animate-pulse';
        case 'faltou': return 'bg-orange-100 border-orange-300 text-orange-800 hover:ring-orange-400';
        case 'cancelado': return 'bg-rose-100 border-rose-300 text-rose-800 hover:ring-rose-400 line-through';
        case 'em_espera': return 'bg-stone-100 border-stone-300 text-stone-700 hover:ring-stone-400';
        case 'agendado':
        default: return 'bg-blue-100 border-blue-300 text-blue-800 hover:ring-blue-400';
    }
}

const TimelineIndicator = () => {
    const [topPosition, setTopPosition] = useState(0);
    React.useEffect(() => {
        const calculatePosition = () => {
            const now = new Date();
            const startOfDayMinutes = START_HOUR * 60;
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            if (nowMinutes < startOfDayMinutes) {
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


// --- Main View Component ---

interface AtendimentosViewProps {
    onAddTransaction: (t: FinancialTransaction) => void;
}

type ViewType = 'Profissional' | 'Andamento' | 'Pagamento';
type PeriodType = 'Dia' | 'Semana' | 'Mês' | 'Lista' | 'Fila de Espera';

const AtendimentosView: React.FC<AtendimentosViewProps> = ({ onAddTransaction }) => {
    // --- State Management ---
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // Real Data States
    const [appointments, setAppointments] = useState<LegacyAppointment[]>([]);
    const [resources, setResources] = useState<LegacyProfessional[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [visibleResourceIds, setVisibleResourceIds] = useState<number[]>([]);
    
    // View States
    const [viewType, setViewType] = useState<ViewType>('Profissional');
    const [periodType, setPeriodType] = useState<PeriodType>('Dia');
    
    // UI States
    const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
    const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
    const [activeMobileProfId, setActiveMobileProfId] = useState<number | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isMobileProfSidebarOpen, setIsMobileProfSidebarOpen] = useState(true);

    const [modalState, setModalState] = useState<{ type: 'appointment' | 'block'; data: any } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; options: any[] } | null>(null);
    const [activeAppointmentDetail, setActiveAppointmentDetail] = useState<LegacyAppointment | null>(null);
    const [isJaciBotOpen, setIsJaciBotOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const appointmentRefs = useRef(new Map<number, HTMLDivElement | null>());
    const columnRefs = useRef<Map<string | number, HTMLDivElement>>(new Map());
    
    const viewDropdownRef = useRef<HTMLDivElement>(null);
    const periodDropdownRef = useRef<HTMLDivElement>(null);

    // --- Data Persistence Logic (READ) ---
    
    const fetchResources = async () => {
        try {
            // FIX: Explicitly select photo_url to ensure professional images load correctly
            const { data, error } = await supabase
                .from('professionals')
                .select('id, name, photo_url, role')
                .order('name');
            
            if (error) throw error;
            
            if (data) {
                const mapped = data.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    avatarUrl: p.photo_url || `https://ui-avatars.com/api/?name=${p.name}&background=random`,
                    role: p.role
                }));
                setResources(mapped);
                setVisibleResourceIds(mapped.map(p => p.id));
                if (mapped.length > 0) setActiveMobileProfId(mapped[0].id);
            }
        } catch (e) {
            console.error("Erro ao buscar profissionais:", e);
        }
    };

    const fetchAppointments = async () => {
        setIsLoadingData(true);
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('*');
            
            if (error) throw error;

            if (data) {
                const mappedAppointments: LegacyAppointment[] = data.map(row => {
                    const startTime = new Date(row.date); 
                    const endTime = new Date(startTime.getTime() + 30 * 60000);

                    let matchedProf = resources.find(p => p.id === Number(row.resource_id)) 
                                    || resources.find(p => p.name === row.professional_name)
                                    || { id: row.resource_id || 0, name: row.professional_name || 'Profissional', avatarUrl: '' };

                    return {
                        id: row.id,
                        start: startTime,
                        end: endTime,
                        status: (row.status as AppointmentStatus) || 'agendado',
                        notas: row.notes || '',
                        client: { 
                            id: 0, 
                            nome: row.client_name || 'Cliente Sem Nome', 
                            consent: true 
                        },
                        professional: matchedProf as LegacyProfessional,
                        service: { 
                            id: 0, 
                            name: row.service_name || 'Serviço', 
                            price: parseFloat(row.value || 0), 
                            duration: 30, 
                            color: '#3b82f6' 
                        }
                    };
                });
                setAppointments(mappedAppointments);
            }
        } catch (e) {
            console.error("Erro ao buscar agendamentos:", e);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        fetchResources();
    }, []);

    useEffect(() => {
        if (resources.length > 0) {
            fetchAppointments();
        }
    }, [resources]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        
        const handleClickOutside = (event: MouseEvent) => {
            if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) setIsViewDropdownOpen(false);
            if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) setIsPeriodDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleDateChange = (direction: number) => {
        if (periodType === 'Dia' || periodType === 'Lista' || periodType === 'Fila de Espera') {
            setCurrentDate(prev => addDays(prev, direction));
        } else if (periodType === 'Semana') {
            setCurrentDate(prev => addWeeks(prev, direction));
        } else if (periodType === 'Mês') {
            setCurrentDate(prev => addMonths(prev, direction));
        }
    };

    const handleResetDate = () => setCurrentDate(new Date());

    const columns = useMemo<DynamicColumn[]>(() => {
        if (periodType === 'Semana') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            const days = eachDayOfInterval({ start, end });
            return days.map(day => ({
                id: day.toISOString(),
                title: format(day, 'EEE', { locale: pt }),
                subtitle: format(day, 'dd/MM'),
                type: 'date',
                data: day
            }));
        }

        if (viewType === 'Profissional') {
            const profs = resources.filter(p => visibleResourceIds.includes(p.id));
            return profs.map(p => ({
                id: p.id,
                title: p.name,
                photo: p.avatarUrl,
                type: 'professional',
                data: p
            }));
        }

        if (viewType === 'Andamento') {
            return [
                { id: 'agendado', title: 'Agendados', type: 'status' },
                { id: 'confirmado', title: 'Confirmados', type: 'status' },
                { id: 'chegou', title: 'Chegou', type: 'status' },
                { id: 'em_atendimento', title: 'Em Atendimento', type: 'status' },
                { id: 'concluido', title: 'Concluídos', type: 'status' }
            ];
        }

        if (viewType === 'Pagamento') {
             return [
                { id: 'pendente', title: 'A Pagar / Aberto', type: 'payment' },
                { id: 'pago', title: 'Pagos', type: 'payment' }
            ];
        }

        return [];
    }, [viewType, periodType, currentDate, visibleResourceIds, resources]);

    const gridStyle = useMemo(() => {
        const colsCount = columns.length || 1;
        const minWidth = isMobile ? '140px' : '180px';
        return {
            gridTemplateColumns: `60px repeat(${colsCount}, minmax(${minWidth}, 1fr))`
        };
    }, [columns.length, isMobile]);

    const filteredAppointments = useMemo(() => {
        let relevantApps = appointments;

        if (periodType === 'Dia') {
            relevantApps = appointments.filter(a => isSameDay(a.start, currentDate));
        } else if (periodType === 'Semana') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            relevantApps = appointments.filter(a => isWithinInterval(a.start, { start, end }));
        } else if (periodType === 'Mês') {
             const start = startOfMonth(currentDate);
             const end = endOfMonth(currentDate);
             relevantApps = appointments.filter(a => isWithinInterval(a.start, { start, end }));
        } else if (periodType === 'Fila de Espera') {
            relevantApps = appointments.filter(a => a.status === 'em_espera');
        }
        if (periodType === 'Lista') {
             relevantApps = appointments.filter(a => isSameDay(a.start, currentDate));
        }

        return relevantApps;
    }, [appointments, periodType, currentDate]);

    const getColumnForAppointment = (app: LegacyAppointment, cols: DynamicColumn[]) => {
        if (periodType === 'Semana') {
            return cols.find(c => isSameDay(app.start, c.data));
        }
        if (viewType === 'Profissional') {
            return cols.find(c => c.id === app.professional.id || c.title === app.professional.name);
        }
        if (viewType === 'Andamento') {
            if (app.status === 'confirmado' || app.status === 'confirmado_whatsapp') return cols.find(c => c.id === 'confirmado');
            return cols.find(c => c.id === app.status);
        }
        if (viewType === 'Pagamento') {
            const isPaid = app.status === 'concluido'; 
            return cols.find(c => c.id === (isPaid ? 'pago' : 'pendente'));
        }
        return null;
    };

    const timeSlots = useMemo(() => Array.from({ length: (END_HOUR - START_HOUR) * 2 }, (_, i) => { 
        const hour = START_HOUR + Math.floor(i / 2);
        const minute = (i % 2) * 30;
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }), []);

    const showToast = (message: string, type: ToastType = 'success') => setToast({ message, type });

    const handleShareAgenda = () => {
        const link = window.location.href;
        navigator.clipboard.writeText(link);
        showToast('Link da agenda copiado para área de transferência!', 'info');
    };

    const handleMobileSidebarClick = (profId: number) => {
        setActiveMobileProfId(profId);
        const el = columnRefs.current.get(profId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    };

    const handleSaveAppointment = async (app: LegacyAppointment) => {
        setModalState(null); 
        try {
            const dateIso = app.start.toISOString();
            const payload = {
                client_name: app.client?.nome || 'Cliente Sem Nome',
                service_name: app.service.name,
                professional_name: app.professional.name, 
                resource_id: app.professional.id,            
                date: dateIso,
                value: typeof app.service.price === 'number' ? app.service.price : parseFloat(app.service.price || '0'),
                status: app.status || 'agendado',
                notes: app.notas || ''
            };

            if (app.id && typeof app.id === 'number' && app.id < 1000000000000) {
                 const { error } = await supabase.from('appointments').update(payload).eq('id', app.id);
                 if (error) throw error;
            } else {
                const { error } = await supabase.from('appointments').insert([payload]);
                if (error) throw error;
            }

            await fetchAppointments(); 
            showToast('Agendamento salvo com sucesso!', 'success');
        } catch (error: any) {
            console.error('Erro ao salvar no banco:', error);
            showToast(`Erro ao salvar: ${error.message}`, 'error');
        }
    };
    
    const handleDeleteAppointment = async (id: number) => {
        if (window.confirm("Tem certeza que deseja excluir este agendamento?")) {
            setAppointments(prev => prev.filter(a => a.id !== id));
            setActiveAppointmentDetail(null);
            
            try {
                await supabase.from('appointments').delete().eq('id', id);
                showToast('Agendamento removido.', 'info');
            } catch (e) {
                showToast('Erro ao remover do banco.', 'error');
                fetchAppointments(); 
            }
        }
    };
    
    const handleStatusUpdate = async (appointmentId: number, newStatus: AppointmentStatus) => {
        setAppointments(prev => prev.map(app => (app.id === appointmentId ? { ...app, status: newStatus } : app)));
        try {
            await supabase.from('appointments').update({ status: newStatus }).eq('id', appointmentId);
            showToast(`Status atualizado para ${newStatus.replace('_', ' ')}`, 'success');
        } catch (e) {
            fetchAppointments();
        }
    };
    
    const handleEditAppointment = (app: LegacyAppointment) => setModalState({ type: 'appointment', data: app });

    const handleNewAppointment = () => {
        const prof = isMobile ? resources.find(p => p.id === activeMobileProfId) : undefined;
        setModalState({ type: 'appointment', data: { start: currentDate, professional: prof } });
    };

    const handleContextMenu = (e: React.MouseEvent, column: DynamicColumn) => {
        if (column.type !== 'professional' && column.type !== 'date') return;
        
        e.preventDefault();
        const gridEl = e.currentTarget as HTMLElement;
        const rect = gridEl.getBoundingClientRect();
        const y = e.clientY - rect.top;
        
        const minutesFromTop = y / PIXELS_PER_MINUTE;
        const totalMinutes = minutesFromTop + START_HOUR * 60;
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;

        const baseDate = column.type === 'date' ? column.data : currentDate;
        const clickedTime = setMinutes(setHours(baseDate, hour), minute);
        const roundedTime = roundToNearestMinutes(clickedTime, { nearestTo: 15 });
        const prof = column.type === 'professional' ? column.data : undefined;

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            options: [
                { label: 'Novo Agendamento', icon: <Plus size={16}/>, onClick: () => setModalState({ type: 'appointment', data: { professional: prof, start: roundedTime } }) },
                { label: 'Bloquear Horário', icon: <Lock size={16}/>, onClick: () => setModalState({ type: 'block', data: { professional: prof, startTime: roundedTime } }) },
            ],
        });
    };

    const DateDisplay = () => {
        let text = "";
        if (periodType === 'Dia' || periodType === 'Lista' || periodType === 'Fila de Espera') {
            text = format(currentDate, "EEE, dd 'de' MMMM", { locale: pt });
        } else if (periodType === 'Semana') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            text = `${format(start, "dd MMM", { locale: pt })} - ${format(end, "dd MMM", { locale: pt })}`;
        } else if (periodType === 'Mês') {
            text = format(currentDate, "MMMM yyyy", { locale: pt });
        }
        return <span className="text-orange-500 font-bold text-lg capitalize px-2">{text.replace('.', '')}</span>;
    }

    return (
        <div className="flex h-full bg-white relative flex-col overflow-visible">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* HEADER - FIX: Increased padding and removed overflow-hidden */}
            <header className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-6 z-30">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        Atendimentos
                        {isLoadingData && <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />}
                    </h2>
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="flex items-center gap-2 text-slate-500">
                            <button onClick={handleShareAgenda} className="p-2 hover:bg-slate-100 rounded-full transition-colors" title="Compartilhar">
                                <Share2 size={20} />
                            </button>
                            <button onClick={() => showToast('Nenhuma notificação nova.', 'info')} className="p-2 hover:bg-slate-100 rounded-full transition-colors relative" title="Notificações">
                                <Bell size={20} />
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                            </button>
                            <button onClick={() => { fetchAppointments(); showToast('Agenda atualizada.', 'success'); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors" title="Atualizar">
                                <RotateCcw size={20} className={isLoadingData ? 'animate-spin' : ''} />
                            </button>
                        </div>
                        <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
                        <div className="flex items-center gap-2">
                            <div className="relative z-[60]" ref={periodDropdownRef}>
                                <button onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                                    {periodType} <ChevronDown size={16} />
                                </button>
                                {isPeriodDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] py-2 animate-in fade-in zoom-in-95">
                                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visualização</div>
                                        {['Dia', 'Semana', 'Mês', 'Lista', 'Fila de Espera'].map((item) => (
                                            <button key={item} onClick={() => { setPeriodType(item as PeriodType); setIsPeriodDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-slate-50 transition-colors ${periodType === item ? 'text-orange-600 font-bold bg-orange-50/50' : 'text-slate-700'}`}>
                                                {item === 'Dia' && <CalendarIcon size={16}/>}
                                                {item === 'Semana' && <CalendarIcon size={16} className="rotate-90"/>}
                                                {item === 'Mês' && <CalendarIcon size={16}/>}
                                                {item === 'Lista' && <List size={16}/>}
                                                {item === 'Fila de Espera' && <Clock size={16}/>}
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={handleNewAppointment} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-xl shadow-lg shadow-orange-100 transition-all active:scale-95">Agendar</button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                    <div className="flex items-center gap-2 w-full md:w-auto justify-between">
                         <button onClick={handleResetDate} className="text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg transition-colors">HOJE</button>
                        <div className="flex items-center gap-1">
                             <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ChevronLeft size={20} /></button>
                             <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ChevronRight size={20} /></button>
                        </div>
                        <DateDisplay />
                    </div>

                    {(periodType === 'Dia' || periodType === 'Semana') && (
                        <div className="relative z-[60]" ref={viewDropdownRef}>
                            <button onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest bg-slate-50 px-3 py-2 rounded-lg transition-all">
                                Agrupar: <span className="text-slate-900">{viewType === 'Profissional' ? 'Por Profissional' : viewType === 'Andamento' ? 'Por Andamento' : 'Por Pagamento'}</span> <ChevronDown size={14} />
                            </button>
                            {isViewDropdownOpen && (
                                <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] py-2 animate-in fade-in zoom-in-95">
                                    <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Critério de Colunas</div>
                                    {['Profissional', 'Andamento', 'Pagamento'].map((item) => (
                                        <button key={item} onClick={() => { setViewType(item as ViewType); setIsViewDropdownOpen(false); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${viewType === item ? 'text-slate-900 font-bold bg-slate-50/50' : 'text-slate-600'}`}>
                                            <span>{item}</span>
                                            {viewType === item && <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Mobile Sidebar */}
                {isMobile && periodType === 'Dia' && viewType === 'Profissional' && (
                    <>
                        <div className={`flex flex-col bg-slate-50 border-r border-slate-200 transition-all duration-300 ease-in-out z-20 ${isMobileProfSidebarOpen ? 'w-20' : 'w-0 overflow-hidden'}`}>
                            <div className="flex-1 overflow-y-auto scrollbar-hide py-4 flex flex-col items-center gap-4 w-20 pb-20">
                                {resources.map(prof => (
                                    <button 
                                        key={prof.id} 
                                        onClick={() => handleMobileSidebarClick(prof.id)} 
                                        className={`relative group transition-all p-1 rounded-full ${activeMobileProfId === prof.id ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                                        title={prof.name}
                                    >
                                        <div className={`w-12 h-12 rounded-full p-0.5 ${activeMobileProfId === prof.id ? 'bg-gradient-to-tr from-orange-400 to-red-500 shadow-md' : 'bg-transparent border border-slate-300'}`}>
                                            {prof.avatarUrl ? (
                                                <img src={prof.avatarUrl} alt={prof.name} className="w-full h-full rounded-full object-cover border-2 border-white" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-orange-100 rounded-full font-bold text-orange-600 border-2 border-white text-xs">
                                                    {prof.name.substring(0,2).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        {activeMobileProfId === prof.id && (
                                            <div className="absolute right-0 bottom-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsMobileProfSidebarOpen(!isMobileProfSidebarOpen)}
                            className="absolute z-30 top-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-r-xl p-2 shadow-lg text-slate-500 hover:text-orange-500 transition-all"
                            style={{ left: isMobileProfSidebarOpen ? '5rem' : '0' }}
                        >
                            {isMobileProfSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                        </button>
                    </>
                )}

                {/* VIEW RENDERER */}
                <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-slate-50 md:bg-white relative">
                    
                    {/* 1. TIMELINE GRID (Dia / Semana) */}
                    {(periodType === 'Dia' || periodType === 'Semana') && (
                        <div className="relative min-h-full min-w-full">
                            {/* Headers - FIX: Consistent professional photos logic */}
                            <div className="grid sticky top-0 z-40 shadow-sm border-b border-slate-200 bg-white" style={gridStyle}>
                                <div className="border-r border-slate-200 h-24 bg-white sticky left-0 z-50"></div>
                                {columns.map((col, index) => (
                                    <div key={col.id} ref={(el) => { if(el) columnRefs.current.set(col.id, el) }} className="flex flex-col items-center justify-center p-2 border-r border-slate-200 h-24 bg-slate-50/30">
                                        {col.type === 'professional' && (
                                            <div className="flex items-center gap-3 justify-center px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm min-w-[140px]">
                                                {col.photo ? (
                                                    <img 
                                                        src={col.photo} 
                                                        alt={col.title} 
                                                        className="w-10 h-10 rounded-full object-cover border-2 border-orange-100 shadow-sm" 
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-white shadow-sm text-sm">
                                                        {col.title.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <span className="text-xs font-bold text-slate-800 truncate block">{col.title}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Colaborador</span>
                                                </div>
                                            </div>
                                        )}
                                        {col.type === 'status' && (
                                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                                                <div className={`w-3 h-3 rounded-full ${
                                                    col.id === 'agendado' ? 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 
                                                    col.id === 'confirmado' ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.5)]' : 
                                                    col.id === 'em_atendimento' ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]' : 
                                                    'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]'
                                                }`}></div>
                                                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">{col.title}</span>
                                            </div>
                                        )}
                                        {col.type === 'payment' && (
                                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                                                {col.id === 'pago' ? <CheckCircle className="w-5 h-5 text-green-500"/> : <DollarSign className="w-5 h-5 text-orange-500"/>}
                                                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">{col.title}</span>
                                            </div>
                                        )}
                                        {col.type === 'date' && (
                                            <div className="flex flex-col items-center">
                                                <span className={`text-[10px] uppercase font-black tracking-widest ${isSameDay(col.data, new Date()) ? 'text-orange-600' : 'text-slate-400'}`}>{col.title}</span>
                                                <span className={`text-xl font-black ${isSameDay(col.data, new Date()) ? 'text-orange-700' : 'text-slate-800'}`}>{col.subtitle}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Grid Body */}
                            <div className="grid relative" style={gridStyle}>
                                {/* Time Column */}
                                <div className="border-r border-slate-200 bg-white sticky left-0 z-30 shadow-md">
                                    {timeSlots.map(time => (
                                        <div key={time} className="h-20 text-right pr-3 text-[11px] text-slate-400 font-bold relative pt-2">
                                            <span className="-translate-y-1/2 block">{time}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Dynamic Columns */}
                                {columns.map((col, index) => {
                                    const colApps = filteredAppointments.filter(app => {
                                        const assignedCol = getColumnForAppointment(app, columns);
                                        return assignedCol?.id === col.id || (col.type === 'professional' && assignedCol?.title === col.title);
                                    });

                                    return (
                                        <div 
                                            key={col.id} 
                                            className={`relative border-r border-slate-200 min-h-[1600px] ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/10'}`}
                                            onContextMenu={(e) => handleContextMenu(e, col)}
                                            onClick={(e) => {
                                                if (isMobile) {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const y = e.clientY - rect.top;
                                                    const minutesFromTop = y / PIXELS_PER_MINUTE;
                                                    const totalMinutes = minutesFromTop + START_HOUR * 60;
                                                    const hour = Math.floor(totalMinutes / 60);
                                                    const minute = totalMinutes % 60;
                                                    const baseDate = col.type === 'date' ? col.data : currentDate;
                                                    const clickedTime = setMinutes(setHours(baseDate, hour), minute);
                                                    const roundedTime = roundToNearestMinutes(clickedTime, { nearestTo: 30 });
                                                    const prof = col.type === 'professional' ? col.data : undefined;
                                                    setModalState({ type: 'appointment', data: { professional: prof, start: roundedTime } });
                                                }
                                            }}
                                        >
                                            {/* Grid Lines */}
                                            {timeSlots.map((_, i) => <div key={i} className="h-20 border-b border-slate-100/50 border-dashed"></div>)}

                                            {/* Appointments */}
                                            {colApps.map(app => {
                                                const duration = (app.end.getTime() - app.start.getTime()) / (1000 * 60);
                                                const isSmall = duration < 45;

                                                return (
                                                <div
                                                    key={app.id}
                                                    ref={(el) => { appointmentRefs.current.set(app.id, el); }}
                                                    onClick={(e) => { e.stopPropagation(); if (app.status !== 'bloqueado') setActiveAppointmentDetail(app); }}
                                                    className={`absolute w-[94%] left-1/2 -translate-x-1/2 rounded-2xl shadow-sm border leading-tight overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:z-20 ${getStatusColor(app.status)} ${isSmall ? 'p-1' : 'p-2'}`}
                                                    style={getAppointmentStyle(app.start, app.end)}
                                                >
                                                    <div style={{ backgroundColor: app.service.color }} className="absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl"></div>
                                                    
                                                    <div className={`flex flex-col h-full relative z-10 pl-3 pr-1 ${isSmall ? 'justify-center' : 'pt-0.5'}`}>
                                                        <div className={`flex justify-between items-start ${isSmall ? 'mb-0' : 'mb-1'}`}>
                                                            <span className={`font-black bg-white/40 rounded-lg text-slate-800 backdrop-blur-sm shadow-sm tracking-tight ${isSmall ? 'text-[9px] px-1 py-0' : 'text-[10px] px-2 py-0.5'}`}>
                                                                {format(app.start, 'HH:mm')}
                                                            </span>
                                                            {app.notas && !isSmall && <FileText size={12} className="text-slate-500/50 ml-1 mt-0.5" />}
                                                        </div>

                                                        <div className={`flex-1 min-h-0 flex flex-col ${isSmall ? 'justify-center' : 'justify-center'}`}>
                                                            <p className={`font-black text-slate-900 truncate ${isSmall ? 'text-[11px] leading-3' : 'text-sm leading-tight mb-0.5'}`}>
                                                                {app.client ? app.client.nome : 'Bloqueio'}
                                                            </p>
                                                            <p className={`font-bold text-slate-600/80 truncate flex items-center gap-1 ${isSmall ? 'text-[9px] leading-3' : 'text-[11px] leading-tight'}`}>
                                                                {app.service.name}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )})}
                                        </div>
                                    );
                                })}
                                <TimelineIndicator />
                            </div>
                        </div>
                    )}

                    {/* 2. LIST & WAITLIST VIEW */}
                    {(periodType === 'Lista' || periodType === 'Fila de Espera') && (
                        <div className="p-8 max-w-5xl mx-auto">
                             {filteredAppointments.length === 0 ? (
                                <div className="text-center py-32 text-slate-300">
                                    <List size={64} className="mx-auto mb-6 opacity-20" />
                                    <p className="text-lg font-bold">Nenhum agendamento para este período.</p>
                                    <button onClick={handleNewAppointment} className="mt-4 text-orange-500 font-bold hover:underline">Agendar Agora</button>
                                </div>
                             ) : (
                                 <div className="space-y-4">
                                    {filteredAppointments
                                        .sort((a,b) => a.start.getTime() - b.start.getTime())
                                        .map(app => (
                                        <div key={app.id} onClick={() => setActiveAppointmentDetail(app)} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-orange-200 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group">
                                            <div className="flex items-center gap-6">
                                                <div className="w-20 text-center bg-slate-50 rounded-2xl p-2 group-hover:bg-orange-50 transition-colors">
                                                    <p className="text-2xl font-black text-slate-800">{format(app.start, 'HH:mm')}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(app.start, 'dd MMM', { locale: pt })}</p>
                                                </div>
                                                <div className="w-px h-12 bg-slate-100"></div>
                                                <div>
                                                    <h4 className="font-black text-slate-800 text-lg">{app.client?.nome || 'Horário Bloqueado'}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">{app.service.name}</span>
                                                        <span className="text-slate-300">•</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <img src={app.professional.avatarUrl} className="w-5 h-5 rounded-full border border-white shadow-sm" alt="" />
                                                            <span className="text-xs text-slate-500 font-medium">com {app.professional.name}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider ${getStatusColor(app.status)}`}>{app.status.replace('_', ' ')}</span>
                                                <div className="font-black text-lg text-slate-700">R$ {app.service.price.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    ))}
                                 </div>
                             )}
                        </div>
                    )}

                    {/* 3. MONTH VIEW */}
                    {periodType === 'Mês' && (
                        <div className="p-6 h-full flex flex-col bg-white">
                            <div className="grid grid-cols-7 gap-3 flex-1">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                    <div key={d} className="text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
                                ))}
                                {(() => {
                                    const start = startOfMonth(currentDate);
                                    const end = endOfMonth(currentDate);
                                    const startDay = start.getDay(); 
                                    const daysInMonth = eachDayOfInterval({ start, end });
                                    const blanks = Array.from({ length: startDay }, (_, i) => i);

                                    return [
                                        ...blanks.map(b => <div key={`blank-${b}`} className="bg-slate-50/30 rounded-3xl border border-transparent"></div>),
                                        ...daysInMonth.map(day => {
                                            const dayApps = filteredAppointments.filter(a => isSameDay(a.start, day));
                                            const isToday = isSameDay(day, new Date());
                                            return (
                                                <div key={day.toISOString()} className={`bg-white border rounded-3xl p-3 min-h-[120px] flex flex-col gap-1.5 transition-all hover:shadow-xl hover:-translate-y-1 ${isToday ? 'border-orange-300 ring-4 ring-orange-50 shadow-lg' : 'border-slate-100 shadow-sm'}`}>
                                                    <span className={`text-lg font-black mb-1 ${isToday ? 'text-orange-600' : 'text-slate-800'}`}>{format(day, 'dd')}</span>
                                                    {dayApps.slice(0, 3).map(app => (
                                                        <div key={app.id} className="text-[9px] font-bold truncate px-2 py-1 rounded-xl bg-orange-50 text-orange-700 border border-orange-100 shadow-sm">
                                                            {format(app.start, 'HH:mm')} {app.client?.nome.split(' ')[0]}
                                                        </div>
                                                    ))}
                                                    {dayApps.length > 3 && (
                                                        <div className="text-[9px] font-black text-slate-400 text-center py-1 bg-slate-50 rounded-xl mt-auto">
                                                            +{dayApps.length - 3} mais
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ];
                                })()}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Modals and Overlays */}
            {modalState?.type === 'appointment' && (
                <AppointmentModal key={modalState.data.id || 'new'} appointment={modalState.data} onClose={() => setModalState(null)} onSave={handleSaveAppointment} />
            )}
            {modalState?.type === 'block' && (
                <BlockTimeModal professional={modalState.data.professional} startTime={modalState.data.startTime} onClose={() => setModalState(null)} onSave={handleSaveAppointment} />
            )}
            {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} options={contextMenu.options} onClose={() => setContextMenu(null)} />}
            <JaciBotPanel isOpen={isJaciBotOpen} onClose={() => setIsJaciBotOpen(false)} />
            
            {activeAppointmentDetail && (
                <AppointmentDetailPopover
                    appointment={activeAppointmentDetail}
                    targetElement={appointmentRefs.current.get(activeAppointmentDetail.id) || null}
                    onClose={() => setActiveAppointmentDetail(null)}
                    onEdit={handleEditAppointment}
                    onDelete={handleDeleteAppointment}
                    onUpdateStatus={handleStatusUpdate}
                />
            )}

             {/* JaciBot Floating Action Button */}
            <div className="fixed md:absolute bottom-8 right-8 z-[70]">
              <button onClick={() => setIsJaciBotOpen(true)} className="w-14 h-14 md:w-16 md:h-16 bg-orange-500 rounded-3xl shadow-2xl flex items-center justify-center text-white hover:bg-orange-600 transition-all hover:scale-110 active:scale-95 duration-200 shadow-orange-300 ring-4 ring-white">
                <MessageSquare className="w-7 h-7 md:w-8 md:h-8" />
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-[11px] font-black rounded-full flex items-center justify-center border-4 border-white shadow-lg">3</span>
              </button>
            </div>
        </div>
    );
};

export default AtendimentosView;
