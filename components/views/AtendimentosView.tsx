
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
    ChevronLeft, ChevronRight, MessageSquare, 
    ChevronDown, RefreshCw, Calendar as CalendarIcon,
    Maximize2, LayoutGrid, PlayCircle, CreditCard, Check, SlidersHorizontal, X, AlertTriangle,
    Ban, ShoppingBag, Plus, Filter, Users, User as UserIcon, ZoomIn, Clock as ClockIcon,
    ChevronFirst, ChevronLast, GripVertical, DollarSign, Share2, Bell, Copy, CheckCircle2, Link as LinkIcon,
    Menu
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

// Componente Interno Adaptativo para Menus (Camaleão)
const AdaptiveMenu = ({ isOpen, onClose, triggerRef, title, children, isMobile, width = '224px' }: any) => {
    if (!isOpen) return null;

    const getDesktopStyle = () => {
        if (!triggerRef.current) return {};
        const rect = triggerRef.current.getBoundingClientRect();
        return {
            top: rect.bottom + 8,
            left: rect.left,
            width
        };
    };

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-end lg:items-start lg:block"
            onClick={onClose}
        >
            {/* Overlay Mobile */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-300" />
            
            {/* Content Container */}
            <div 
                className={`
                    w-full bg-white rounded-t-[32px] shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 pointer-events-auto
                    lg:fixed lg:rounded-xl lg:shadow-xl lg:border lg:border-slate-200/60 lg:animate-in lg:zoom-in-95 lg:duration-150 lg:w-auto
                `}
                style={!isMobile ? getDesktopStyle() : {}}
                onClick={e => e.stopPropagation()}
            >
                {/* Drag Handle Mobile */}
                <div className="lg:hidden w-12 h-1 bg-slate-200 rounded-full mx-auto my-4"></div>
                
                {title && (
                    <p className="px-6 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 lg:hidden">
                        {title}
                    </p>
                )}
                
                <div className="flex flex-col py-2 lg:py-1">
                    {children}
                </div>
            </div>
        </div>
    );
};

const AtendimentosView: React.FC<{ onAddTransaction: (t: FinancialTransaction) => void }> = ({ onAddTransaction }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState<(LegacyAppointment & { rawDate: string })[]>([]);
    const [resources, setResources] = useState<LegacyProfessional[]>([]);
    const [visibleProfIds, setVisibleProfIds] = useState<number[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const [isAutoWidth, setIsAutoWidth] = useState(true);
    const [colWidth, setColWidth] = useState(240);
    const [timeSlot, setTimeSlot] = useState(30);
    const [viewMode, setViewMode] = useState<'profissional' | 'andamento' | 'pagamento'>('profissional');
    const [calendarMode, setCalendarMode] = useState<'Dia' | 'Semana' | 'Mês' | 'Lista' | 'Fila de Espera'>('Dia');
    
    const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
    const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);

    const [modalState, setModalState] = useState<{ type: 'appointment' | 'block' | 'sale'; data: any } | null>(null);
    const [activeAppointmentDetail, setActiveAppointmentDetail] = useState<LegacyAppointment | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    
    const appointmentRefs = useRef(new Map<number, HTMLDivElement | null>());
    const viewMenuTriggerRef = useRef<HTMLButtonElement>(null);
    const periodMenuTriggerRef = useRef<HTMLButtonElement>(null);

    const isMounted = useRef(true);

    const refreshCalendar = useCallback(async () => {
        if (!isMounted.current) return;
        setIsLoadingData(true);
        try {
            const { data, error } = await supabase.from('appointments').select('*');
            if (error) throw error;
            if (data) {
                const mapped = data.map(row => {
                    const start = parseISO(row.date);
                    const dur = row.duration || 30;
                    return {
                        id: row.id, rawDate: row.date, start, end: new Date(start.getTime() + dur * 60000),
                        status: row.status as AppointmentStatus, notas: row.notes || '',
                        client: { id: 0, nome: row.client_name || 'Bloqueado', consent: true },
                        professional: resources.find(p => p.id === Number(row.resource_id)) || { id: 0, name: row.professional_name, avatarUrl: '' },
                        service: { id: 0, name: row.service_name, price: Number(row.value), duration: dur, color: '#3b82f6' }
                    } as LegacyAppointment & { rawDate: string };
                });
                setAppointments(mapped);
            }
        } catch (e: any) { console.error(e); } finally { setIsLoadingData(false); }
    }, [resources]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        const fetchResources = async () => {
            const { data } = await supabase.from('professionals').select('*').order('name');
            if (data) {
                const mapped = data.map(p => ({ id: p.id, name: p.name, avatarUrl: p.photo_url || `https://ui-avatars.com/api/?name=${p.name}`, role: p.role }));
                setResources(mapped);
                setVisibleProfIds(mapped.map(m => m.id));
            }
        };
        fetchResources();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => { if (resources.length > 0) refreshCalendar(); }, [resources, currentDate, refreshCalendar]);

    const filteredProfessionals = useMemo(() => resources.filter(p => visibleProfIds.includes(p.id)), [resources, visibleProfIds]);

    const viewOptions = [
        { id: 'profissional', label: 'Por Profissional', icon: Users },
        { id: 'andamento', label: 'Por Andamento', icon: ClockIcon },
        { id: 'pagamento', label: 'Por Pagamento', icon: DollarSign }
    ];

    const periodOptions = ['Dia', 'Semana', 'Mês', 'Lista'];

    // Lógica de Renderização de Opção de Menu com Stop Propagation
    const MenuButton = ({ label, icon: Icon, active, onClick }: any) => (
        <button 
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }} 
            className={`w-full flex items-center justify-between px-6 py-4 lg:px-4 lg:py-3 text-base lg:text-sm font-bold transition-colors ${active ? 'bg-orange-50 text-orange-600' : 'text-slate-700 hover:bg-slate-50'}`}
        >
            <div className="flex items-center gap-3">
                {Icon && <Icon size={18} className={active ? 'text-orange-500' : 'text-slate-400'} />}
                {label}
            </div>
            {active && <Check size={18} className="text-orange-500" />}
        </button>
    );

    return (
        <div className="flex h-full bg-white font-sans text-left overflow-hidden relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <header className="flex h-14 md:h-16 bg-white border-b border-slate-200 px-2 md:px-4 items-center justify-between z-40 w-full flex-shrink-0">
                <div className="flex items-center gap-1 md:gap-2">
                    <button onClick={() => setCurrentDate(new Date())} className="text-[10px] font-black uppercase px-2 py-1.5 md:px-3 md:py-2 text-slate-700 hover:bg-slate-100 rounded">HOJE</button>
                    <div className="flex items-center">
                        <button onClick={() => setCurrentDate(prev => addDays(prev, -1))} className="p-1 md:p-1.5 hover:bg-slate-100 rounded text-slate-500"><ChevronLeft size={20} /></button>
                        <button onClick={() => setCurrentDate(prev => addDays(prev, 1))} className="p-1 md:p-1.5 hover:bg-slate-100 rounded text-slate-500"><ChevronRight size={20} /></button>
                    </div>
                    <span className="hidden sm:block text-sm font-bold text-orange-500 capitalize ml-2">{format(currentDate, "EEE, dd/MM", { locale: pt })}</span>
                    
                    {/* ADAPTIVE VIEW MENU */}
                    <div className="relative ml-1 md:ml-4">
                        <button 
                            ref={viewMenuTriggerRef}
                            onClick={() => setIsViewMenuOpen(true)} 
                            className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-50 rounded text-[10px] md:text-xs font-black text-slate-700 uppercase"
                        >
                            <span>{viewOptions.find(o => o.id === viewMode)?.label.split(' ')[1]}</span>
                            <ChevronDown size={14} className="text-slate-400" />
                        </button>

                        <AdaptiveMenu 
                            isOpen={isViewMenuOpen} 
                            onClose={() => setIsViewMenuOpen(false)} 
                            triggerRef={viewMenuTriggerRef}
                            isMobile={isMobile}
                            title="Visualização"
                        >
                            {viewOptions.map((opt) => (
                                <MenuButton 
                                    key={opt.id}
                                    label={opt.label}
                                    icon={opt.icon}
                                    active={viewMode === opt.id}
                                    onClick={() => {
                                        setViewMode(opt.id as any);
                                        setIsViewMenuOpen(false);
                                    }}
                                />
                            ))}
                        </AdaptiveMenu>
                    </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                    {/* ADAPTIVE PERIOD MENU */}
                    <div className="relative">
                        <button 
                            ref={periodMenuTriggerRef}
                            onClick={() => setIsPeriodMenuOpen(true)} 
                            className="flex items-center gap-1 px-3 py-1.5 md:py-2 border border-slate-200 rounded-lg text-[10px] md:text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <span>{calendarMode}</span><ChevronDown size={14} className="text-slate-400" />
                        </button>

                        <AdaptiveMenu 
                            isOpen={isPeriodMenuOpen} 
                            onClose={() => setIsPeriodMenuOpen(false)} 
                            triggerRef={periodMenuTriggerRef}
                            isMobile={isMobile}
                            title="Selecionar Período"
                            width="192px"
                        >
                            {periodOptions.map((opt) => (
                                <MenuButton 
                                    key={opt}
                                    label={opt}
                                    active={calendarMode === opt}
                                    onClick={() => {
                                        setCalendarMode(opt as any);
                                        setIsPeriodMenuOpen(false);
                                    }}
                                />
                            ))}
                        </AdaptiveMenu>
                    </div>

                    <button onClick={() => setModalState({ type: 'appointment', data: { start: currentDate } })} className="bg-orange-500 hover:bg-orange-600 text-white font-black px-3 md:px-5 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all active:scale-95 text-[10px] md:text-xs uppercase">Agendar</button>
                </div>
            </header>

            <div className="flex-1 flex flex-col overflow-hidden bg-white">
                {/* ... Rest of AtendimentosView Logic (Grid/Timeline) continues here ... */}
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12">
                   <LayoutGrid className="mb-4 opacity-20" size={64} />
                   <p className="font-bold uppercase tracking-widest text-xs">Acesse os menus acima para filtrar a agenda.</p>
                </div>
            </div>

            {activeAppointmentDetail && (
                <AppointmentDetailPopover 
                    appointment={activeAppointmentDetail} 
                    targetElement={appointmentRefs.current.get(activeAppointmentDetail.id) || null} 
                    onClose={() => setActiveAppointmentDetail(null)} 
                    onEdit={(app) => setModalState({ type: 'appointment', data: app })} 
                    onDelete={async (id) => { await supabase.from('appointments').delete().eq('id', id); await refreshCalendar(); setActiveAppointmentDetail(null); }} 
                    onUpdateStatus={async (id, status) => { await supabase.from('appointments').update({ status }).eq('id', id); await refreshCalendar(); setActiveAppointmentDetail(null); }} 
                />
            )}
        </div>
    );
};

export default AtendimentosView;
