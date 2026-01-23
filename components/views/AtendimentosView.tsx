
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
    ChevronLeft, ChevronRight, MessageSquare, 
    ChevronDown, RefreshCw, Calendar as CalendarIcon,
    ShoppingBag, Ban, Maximize2, 
    LayoutGrid, PlayCircle, CreditCard, Check, SlidersHorizontal, X, Clock,
    AlertTriangle, ArrowRight, CalendarDays, DollarSign, CheckCircle, Trash2, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { 
    format, addDays, addWeeks, addMonths, eachDayOfInterval, 
    isSameDay, isWithinInterval, isSameMonth, addMinutes, 
    endOfDay, endOfWeek, endOfMonth, startOfDay
} from 'date-fns';
import { ptBR as pt } from 'date-fns/locale/pt-BR';

import { LegacyAppointment, AppointmentStatus, FinancialTransaction, LegacyProfessional } from '../../types';
import AppointmentModal from '../modals/AppointmentModal';
import BlockTimeModal from '../modals/BlockTimeModal';
import NewTransactionModal from '../modals/NewTransactionModal';
import AppointmentDetailPopover from '../shared/AppointmentDetailPopover';
import Toast, { ToastType } from '../shared/Toast';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useStudio } from '../../contexts/StudioContext';

const START_HOUR = 8;
const END_HOUR = 20; 
const SLOT_PX_HEIGHT = 80; 

const getAppointmentPosition = (start: Date, end: Date, timeSlot: number) => {
    const pixelsPerMinute = SLOT_PX_HEIGHT / timeSlot;
    const startMinutesSinceDayStart = (start.getHours() * 60 + start.getMinutes()) - (START_HOUR * 60);
    const durationMinutes = (end.getTime() - start.getTime()) / 60000;
    const top = Math.floor(startMinutesSinceDayStart * pixelsPerMinute);
    const height = Math.max(20, Math.floor(durationMinutes * pixelsPerMinute));
    return { position: 'absolute' as const, top: `${top}px`, height: `${height}px`, width: '100%', zIndex: 20, left: '0px' };
};

const TimelineIndicator = ({ timeSlot }: { timeSlot: number }) => {
    const [topPosition, setTopPosition] = useState(0);
    useEffect(() => {
        const calculatePosition = () => {
            const now = new Date();
            const startMinutes = START_HOUR * 60;
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            if (nowMinutes < startMinutes || nowMinutes > (END_HOUR * 60)) { setTopPosition(-1); return; }
            const pixelsPerMinute = SLOT_PX_HEIGHT / timeSlot;
            const top = (nowMinutes - startMinutes) * pixelsPerMinute;
            setTopPosition(top);
        };
        calculatePosition();
        const intervalId = setInterval(calculatePosition, 60000); 
        return () => intervalId && clearInterval(intervalId);
    }, [timeSlot]);
    if (topPosition < 0) return null;
    return (
        <div className="absolute w-full z-10 pointer-events-none" style={{ top: `${topPosition}px` }}>
            <div className="h-px bg-red-500 w-full relative"><div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm"></div></div>
        </div>
    );
};

interface AtendimentosViewProps {
    onAddTransaction: (t: FinancialTransaction) => void;
    onNavigateToCommand?: (id: string) => void;
}

const AtendimentosView: React.FC<AtendimentosViewProps> = ({ onAddTransaction, onNavigateToCommand }) => {
    const { user, loading: authLoading } = useAuth(); 
    const { activeStudioId } = useStudio();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState<any[]>([]);
    const [resources, setResources] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [modalState, setModalState] = useState<{ type: 'appointment' | 'block' | 'sale'; data: any } | null>(null);
    const [activeAppointmentDetail, setActiveAppointmentDetail] = useState<LegacyAppointment | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, time: Date, professional: any } | null>(null);
    
    const [colWidth] = useState(220);
    const [timeSlot] = useState(30);
    const isMounted = useRef(true);
    const appointmentRefs = useRef(new Map<number | string, HTMLDivElement | null>());

    const fetchResources = async () => {
        if (!activeStudioId) return;
        try {
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .eq('studio_id', activeStudioId)
                .eq('active', true)
                .eq('show_in_calendar', true)
                .order('order_index', { ascending: true });
            
            if (error) throw error;
            setResources(data || []);
        } catch (e) {
            console.error("Erro ao carregar equipe:", e);
        }
    };

    const fetchAppointments = async () => {
        if (!isMounted.current || authLoading || !activeStudioId) return;
        setIsLoadingData(true);
        try {
            const dayStart = new Date(currentDate);
            dayStart.setHours(0,0,0,0);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('studio_id', activeStudioId)
                .gte('start_at', dayStart.toISOString())
                .lt('start_at', dayEnd.toISOString())
                .neq('status', 'cancelado')
                .order('start_at', { ascending: true });

            if (error) throw error;

            const mapped = (data || []).map(app => {
                // Tenta encontrar o profissional no estado local para mapear nome e foto
                const prof = resources.find(r => r.resource_id === app.professional_id);
                return {
                    ...app,
                    type: 'appointment',
                    start: new Date(app.start_at),
                    end: new Date(app.end_at),
                    professional: prof || { name: app.professional_name, id: app.professional_id },
                    service: { name: app.service_name, price: Number(app.value), duration: app.duration, color: app.service_color || '#3b82f6' },
                    client: { nome: app.client_name, id: app.client_id }
                };
            });

            setAppointments(mapped);
        } catch (e: any) {
            console.error("Erro ao carregar agendamentos:", e.message);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => { 
        fetchResources().then(() => fetchAppointments());
    }, [currentDate, activeStudioId]);

    const handleSaveAppointment = async (app: LegacyAppointment) => {
        if (!activeStudioId) return;
        
        // Mapeamento de professional_id para o UUID técnico (resource_id)
        const teamMember = resources.find(r => String(r.id) === String(app.professional.id) || r.resource_id === app.professional.id);
        if (!teamMember?.resource_id) {
            setToast({ message: "Erro: Profissional sem UUID vinculado.", type: 'error' });
            return;
        }

        setIsLoadingData(true);
        try {
            const payload = {
                studio_id: activeStudioId,
                client_id: app.client?.id || null,
                client_name: app.client?.nome || 'Consumidor Final',
                professional_id: teamMember.resource_id, // FK professionals(id_uuid)
                professional_name: teamMember.name,
                service_id: app.service.id,
                service_name: app.service.name,
                value: app.service.price,
                duration: app.service.duration,
                date: app.start.toISOString(),
                start_at: app.start.toISOString(),
                end_at: app.end.toISOString(),
                status: app.status || 'agendado',
                notes: app.notas || '',
                origem: 'interno'
            };

            // ✅ BLINDAGEM TOTAL: Remove ID e campos de sistema para o INSERT
            const { id, created_at, updated_at, ...safePayload } = payload as any;
            delete (safePayload as any).id;

            const isUpdate = !!app.id && typeof app.id === 'string' && app.id.includes('-');

            const { data, error } = isUpdate 
                ? await supabase.from('appointments').update(safePayload).eq('id', app.id).select()
                : await supabase.from('appointments').insert([safePayload]).select();

            if (error) throw error;

            setToast({ message: "Agendamento gravado!", type: 'success' });
            setModalState(null);
            fetchAppointments();
        } catch (e: any) {
            setToast({ message: "Erro ao salvar: " + (e.details || e.message), type: 'error' });
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleSaveBlock = async (block: any) => {
        if (!activeStudioId) return;
        setIsLoadingData(true);
        try {
            const payload = {
                studio_id: activeStudioId,
                professional_id: block.professional.resource_id,
                professional_name: block.professional.name,
                service_name: 'HORÁRIO BLOQUEADO',
                start_at: block.start.toISOString(),
                end_at: block.end.toISOString(),
                date: block.start.toISOString(),
                status: 'bloqueado',
                origem: 'interno'
            };

            const { error } = await supabase.from('appointments').insert([payload]);
            if (error) throw error;

            setToast({ message: "Horário bloqueado!", type: 'success' });
            setModalState(null);
            fetchAppointments();
        } catch (e: any) {
            setToast({ message: "Erro no bloqueio: " + e.message, type: 'error' });
        } finally {
            setIsLoadingData(false);
        }
    };

    const moveProfessional = async (profId: string | number, direction: 'left' | 'right') => {
        const index = resources.findIndex(r => r.id === profId);
        if (index === -1) return;
        const targetIndex = direction === 'left' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= resources.length) return;

        const profA = resources[index];
        const profB = resources[targetIndex];

        // Swap de order_index
        const oldIndexA = profA.order_index;
        const oldIndexB = profB.order_index;

        try {
            const { error: errA } = await supabase.from('team_members').update({ order_index: oldIndexB }).eq('id', profA.id);
            const { error: errB } = await supabase.from('team_members').update({ order_index: oldIndexA }).eq('id', profB.id);
            
            if (errA || errB) throw new Error("Falha ao persistir ordem");
            
            await fetchResources();
        } catch (e) {
            setToast({ message: "Erro ao reordenar profissionais.", type: 'error' });
        }
    };

    const handleGridClick = (col: any, timeIdx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const minutesToAdd = timeIdx * timeSlot;
        const targetTime = addMinutes(startOfDay(currentDate), (START_HOUR * 60) + minutesToAdd);
        setSelectionMenu({ x: e.clientX, y: e.clientY, time: targetTime, professional: col.data });
    };

    const columns = useMemo(() => resources.map(p => ({ 
        id: p.id, 
        title: p.name, 
        photo: p.photo_url || `https://ui-avatars.com/api/?name=${p.name}&background=random`, 
        type: 'professional' as const, 
        data: p 
    })), [resources]);

    const timeSlotsLabels = useMemo(() => {
        const labels = [];
        for (let i = 0; i < (END_HOUR - START_HOUR) * 60 / timeSlot; i++) {
            const m = i * timeSlot;
            labels.push(`${String(START_HOUR + Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
        }
        return labels;
    }, [timeSlot]);

    return (
        <div className="h-full bg-white relative flex-col font-sans text-left overflow-hidden flex">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <header className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 z-30 shadow-sm">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">Radar de Atendimento {isLoadingData && <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />}</h2>
                    <button onClick={() => setModalState({ type: 'appointment', data: { start: currentDate } })} className="bg-orange-500 hover:bg-orange-600 text-white font-black py-2.5 px-6 rounded-xl shadow-lg transition-all active:scale-95 uppercase">Agendar</button>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentDate(new Date())} className="text-xs font-bold bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors uppercase tracking-widest">Hoje</button>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentDate(prev => addDays(prev, -1))} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ChevronLeft size={20} /></button>
                        <button onClick={() => setCurrentDate(prev => addDays(prev, 1))} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ChevronRight size={20} /></button>
                    </div>
                    <span className="text-orange-500 font-black text-lg capitalize tracking-tight">{format(currentDate, "EEEE, dd 'de' MMMM", { locale: pt })}</span>
                </div>
            </header>

            <div className="flex-1 overflow-auto bg-slate-50 relative custom-scrollbar" onClick={() => setSelectionMenu(null)}>
                <div className="min-w-fit">
                    <div className="grid sticky top-0 z-[50] border-b border-slate-200 bg-white shadow-sm" style={{ gridTemplateColumns: `60px repeat(${columns.length}, minmax(${colWidth}px, 1fr))` }}>
                        <div className="sticky left-0 z-[60] bg-white border-r border-slate-200 h-24 min-w-[60px] flex items-center justify-center"><Maximize2 size={16} className="text-slate-300" /></div>
                        {columns.map((col, idx) => (
                            <div key={col.id} className="flex flex-col items-center justify-center p-2 border-r border-slate-100 h-24 bg-white relative group">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-sm w-full max-w-[200px] overflow-hidden">
                                    {(col as any).photo && <img src={(col as any).photo} className="w-8 h-8 rounded-full object-cover" />}
                                    <span className="text-[11px] font-black text-slate-800 truncate">{col.title}</span>
                                </div>
                                <div className="absolute -bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                    <button onClick={(e) => { e.stopPropagation(); moveProfessional(col.id, 'left'); }} className="p-1 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-orange-500 shadow-sm"><ChevronLeft size={12}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); moveProfessional(col.id, 'right'); }} className="p-1 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-orange-500 shadow-sm"><ChevronRight size={12}/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid relative" style={{ gridTemplateColumns: `60px repeat(${columns.length}, minmax(${colWidth}px, 1fr))` }}>
                        <div className="sticky left-0 z-[40] bg-white border-r border-slate-200 min-w-[60px]">
                            {timeSlotsLabels.map(time => (
                                <div key={time} className="h-20 text-right pr-3 text-[10px] text-slate-400 font-black relative border-b border-slate-100/50 border-dashed bg-white">
                                    <span className="absolute top-0 right-3 -translate-y-1/2 bg-white px-1 z-10">{time}</span>
                                </div>
                            ))}
                        </div>
                        {columns.map((col) => (
                            <div key={col.id} className="relative border-r border-slate-200 cursor-crosshair bg-white" style={{ minHeight: `${timeSlotsLabels.length * SLOT_PX_HEIGHT}px` }}>
                                {timeSlotsLabels.map((_, i) => (
                                    <div key={i} onClick={(e) => handleGridClick(col, i, e)} className="h-20 border-b border-slate-100/50 border-dashed hover:bg-orange-50/30 transition-colors"></div>
                                ))}
                                {appointments.filter(app => String(app.professional_id) === String(col.data.resource_id)).map(app => {
                                    const color = app.status === 'bloqueado' ? '#94a3b8' : (app.service?.color || '#3b82f6');
                                    return (
                                        <div 
                                            key={app.id} 
                                            ref={(el) => { if (app.status !== 'bloqueado') appointmentRefs.current.set(app.id, el); }} 
                                            onClick={(e) => { e.stopPropagation(); if (app.status !== 'bloqueado') setActiveAppointmentDetail(app); }} 
                                            className="rounded shadow-sm border-l-4 p-2 cursor-pointer hover:brightness-95 transition-all overflow-hidden flex flex-col group/card border-r border-b border-slate-200/50 z-20" 
                                            style={{ ...getAppointmentPosition(app.start, app.end, timeSlot), borderLeftColor: color, backgroundColor: `${color}15` }}
                                        >
                                            <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">{format(app.start, 'HH:mm')}</p>
                                            <p className="text-xs font-bold text-slate-800 truncate leading-tight">{app.client_name || (app.status === 'bloqueado' ? 'BLOQUEADO' : 'Cliente')}</p>
                                            <p className="text-[9px] text-slate-500 truncate mt-1">{app.service_name}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                        <TimelineIndicator timeSlot={timeSlot} />
                    </div>
                </div>

                {selectionMenu && (
                    <div className="fixed z-[200] bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 min-w-[220px] animate-in zoom-in-95 duration-200" style={{ top: selectionMenu.y, left: selectionMenu.x }} onClick={(e) => e.stopPropagation()}>
                        <div className="px-4 py-2 border-b border-slate-50 mb-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ações do Horário</p>
                            <p className="text-xs font-bold text-slate-700">{format(selectionMenu.time, 'HH:mm')} • {selectionMenu.professional.name}</p>
                        </div>
                        <button onClick={() => { setModalState({ type: 'appointment', data: { start: selectionMenu.time, professional: selectionMenu.professional } }); setSelectionMenu(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-all"><CalendarIcon size={18} /> Novo Agendamento</button>
                        <button onClick={() => { setSelectionMenu(null); alert('Ação vinculada: Registrar Venda para ' + selectionMenu.professional.name); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all"><ShoppingBag size={18} /> Registrar Venda</button>
                        <button onClick={() => { setModalState({ type: 'block', data: { professional: selectionMenu.professional, startTime: selectionMenu.time } }); setSelectionMenu(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"><Ban size={18} /> Bloquear Horário</button>
                    </div>
                )}
            </div>

            {activeAppointmentDetail && (
                <AppointmentDetailPopover 
                    appointment={activeAppointmentDetail} 
                    targetElement={appointmentRefs.current.get(activeAppointmentDetail.id) || null} 
                    onClose={() => setActiveAppointmentDetail(null)} 
                    onEdit={(app) => { setModalState({ type: 'appointment', data: app }); setActiveAppointmentDetail(null); }} 
                    onDelete={async (id) => { if(confirm("Apagar horário?")) { await supabase.from('appointments').delete().eq('id', id); fetchAppointments(); setActiveAppointmentDetail(null); } }} 
                    onUpdateStatus={async (id, status) => { await supabase.from('appointments').update({ status }).eq('id', id); fetchAppointments(); }}
                />
            )}
            {modalState?.type === 'appointment' && <AppointmentModal appointment={modalState.data} onClose={() => setModalState(null)} onSave={handleSaveAppointment} />}
            {modalState?.type === 'block' && <BlockTimeModal professional={modalState.data.professional} startTime={modalState.data.startTime} onClose={() => setModalState(null)} onSave={handleSaveBlock} />}
        </div>
    );
};

export default AtendimentosView;
