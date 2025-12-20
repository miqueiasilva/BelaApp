
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
    ChevronLeft, ChevronRight, Plus, RefreshCw, 
    User as UserIcon, Settings, Bell, Filter, 
    X, SlidersHorizontal, Lock, Clock, ArrowLeft, ArrowRight,
    Globe, Info, Search, Loader2
} from 'lucide-react';
import { format, addDays, differenceInMinutes, startOfDay, endOfDay } from 'date-fns';
import { pt } from 'date-fns/locale';

import { LegacyAppointment, AppointmentStatus, LegacyProfessional } from '../../types';
import AppointmentModal from '../modals/AppointmentModal';
import AppointmentDetailPopover from '../shared/AppointmentDetailPopover';
import Toast, { ToastType } from '../shared/Toast';
import { supabase } from '../../services/supabaseClient';

// --- Constantes de Layout ---
const START_HOUR = 8;
const END_HOUR = 21; 
const ROW_HEIGHT = 80; // Altura base para 60min (Pixels por hora)

interface AtendimentosViewProps {
    onAddTransaction: (t: any) => void;
}

const AtendimentosView: React.FC<AtendimentosViewProps> = () => {
    // --- Estados de Dados ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState<LegacyAppointment[]>([]);
    const [professionals, setProfessionals] = useState<LegacyProfessional[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- Estados de Visualização ---
    const [colWidth, setColWidth] = useState(240); // Zoom (150px a 400px)
    const [colorMode, setColorMode] = useState<'professional' | 'status'>('professional');
    const [visibleProfIds, setVisibleProfIds] = useState<number[]>([]);
    const [showMobileSettings, setShowMobileSettings] = useState(false);

    // --- Estados de UI ---
    const [modalState, setModalState] = useState<{ type: 'appointment' | 'block'; data: any } | null>(null);
    const [activeDetail, setActiveDetail] = useState<LegacyAppointment | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const appointmentRefs = useRef(new Map<number, HTMLDivElement | null>());

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        setToast({ message, type });
    }, []);

    // --- Fetch de Dados do Supabase ---
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Buscar Profissionais Ativos (Ordenados)
            const { data: profs, error: pErr } = await supabase
                .from('professionals')
                .select('*')
                .eq('active', true)
                .order('display_order', { ascending: true });
            
            if (pErr) throw pErr;
            
            const mappedProfs: LegacyProfessional[] = (profs || []).map(p => ({
                id: p.id,
                name: p.name,
                avatarUrl: p.photo_url || `https://ui-avatars.com/api/?name=${p.name}&background=random`,
                role: p.role,
                color: p.color || '#F97316', // Laranja Belaflow default
                display_order: p.display_order
            } as any));
            
            setProfessionals(mappedProfs);

            // Regra: Se é a primeira carga, marca todos como visíveis
            if (visibleProfIds.length === 0 && mappedProfs.length > 0) {
                setVisibleProfIds(mappedProfs.map(p => p.id));
            }

            // 2. Buscar Agendamentos do Dia Selecionado
            const tStart = startOfDay(currentDate).toISOString();
            const tEnd = endOfDay(currentDate).toISOString();

            const { data: apps, error: aErr } = await supabase
                .from('appointments')
                .select('*')
                .gte('date', tStart)
                .lte('date', tEnd);
            
            if (aErr) throw aErr;

            const mappedApps: LegacyAppointment[] = (apps || []).map(row => {
                const start = new Date(row.date);
                // Calcula fim baseado no banco ou duração padrão de 30min
                const end = row.end_date ? new Date(row.end_date) : new Date(start.getTime() + 30 * 60000);
                const prof = mappedProfs.find(p => p.id === Number(row.resource_id)) || mappedProfs[0];

                return {
                    id: row.id,
                    start, 
                    end,
                    status: (row.status as AppointmentStatus) || 'agendado',
                    client: { id: 0, nome: row.client_name || 'Cliente', consent: true },
                    professional: prof,
                    service: { 
                        id: 0, 
                        name: row.service_name || 'Serviço', 
                        price: parseFloat(row.value) || 0, 
                        duration: 30, 
                        color: row.color || '#3b82f6' 
                    },
                    notas: row.notes,
                    origem: row.origem // Importante para o indicador online
                } as any;
            });

            setAppointments(mappedApps);
        } catch (e: any) {
            console.error(e);
            showToast("Erro ao sincronizar agenda", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [currentDate, visibleProfIds.length, showToast]);

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    // --- Helpers de Estilo e Grade ---
    const timeSlots = useMemo(() => {
        const slots = [];
        for (let h = START_HOUR; h < END_HOUR; h++) {
            slots.push(`${String(h).padStart(2, '0')}:00`);
            slots.push(`${String(h).padStart(2, '0')}:30`);
        }
        return slots;
    }, []);

    const getAppStyle = (app: LegacyAppointment) => {
        const startMinutes = app.start.getHours() * 60 + app.start.getMinutes();
        const endMinutes = app.end.getHours() * 60 + app.end.getMinutes();
        const pixelsPerMin = ROW_HEIGHT / 60;
        
        const top = (startMinutes - START_HOUR * 60) * pixelsPerMin;
        const height = Math.max(24, (endMinutes - startMinutes) * pixelsPerMin);

        let bgColor = app.professional?.color || '#3b82f6';
        if (colorMode === 'status') {
            switch(app.status) {
                case 'concluido': bgColor = '#10b981'; break; 
                case 'bloqueado': bgColor = '#64748b'; break; 
                case 'cancelado': bgColor = '#f43f5e'; break; 
                case 'agendado': bgColor = '#f59e0b'; break; 
                case 'confirmado': bgColor = '#0ea5e9'; break;
                default: bgColor = '#6366f1';
            }
        }

        return {
            top: `${top}px`,
            height: `${height - 2}px`,
            backgroundColor: bgColor,
        };
    };

    const handleMoveColumn = async (prof: LegacyProfessional, direction: 'left' | 'right') => {
        const index = professionals.findIndex(p => p.id === prof.id);
        const targetIndex = direction === 'left' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= professionals.length) return;

        const targetProf = professionals[targetIndex];
        const currentOrder = (prof as any).display_order || 0;
        const targetOrder = (targetProf as any).display_order || 0;

        try {
            await supabase.from('professionals').update({ display_order: targetOrder }).eq('id', prof.id);
            await supabase.from('professionals').update({ display_order: currentOrder }).eq('id', targetProf.id);
            fetchData();
        } catch (err: any) {
            showToast("Erro ao reordenar", "error");
        }
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
                origem: 'interno'
            };

            const { error } = app.id && app.id < 1e12
                ? await supabase.from('appointments').update(payload).eq('id', app.id)
                : await supabase.from('appointments').insert([payload]);

            if (error) throw error;
            showToast("Agendamento salvo!");
            fetchData();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Componentes Internos ---
    const SidebarControls = () => (
        <div className="space-y-8">
            {/* Zoom Slider */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zoom da Grade</label>
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{colWidth}px</span>
                </div>
                <input 
                    type="range" min="150" max="400" step="10"
                    value={colWidth} onChange={(e) => setColWidth(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
            </div>

            {/* View Mode */}
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cores dos Cards</label>
                <div className="grid grid-cols-1 gap-2">
                    <button 
                        onClick={() => setColorMode('professional')}
                        className={`flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${colorMode === 'professional' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 text-slate-500 bg-white hover:border-slate-200'}`}
                    >
                        <span className="text-xs font-bold text-left leading-tight">Por Profissional</span>
                        <UserIcon size={14} />
                    </button>
                    <button 
                        onClick={() => setColorMode('status')}
                        className={`flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${colorMode === 'status' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 text-slate-500 bg-white hover:border-slate-200'}`}
                    >
                        <span className="text-xs font-bold text-left leading-tight">Por Status</span>
                        <Filter size={14} />
                    </button>
                </div>
            </div>

            {/* Team Filter */}
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar Equipe</label>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                    {professionals.map(p => (
                        <label key={p.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                            <input 
                                type="checkbox" 
                                checked={visibleProfIds.includes(p.id)} 
                                onChange={() => setVisibleProfIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                                className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                            />
                            <div className="flex items-center gap-2 min-w-0">
                                <img src={p.avatarUrl} className="w-6 h-6 rounded-full object-cover flex-shrink-0" alt="" />
                                <span className="text-xs font-bold text-slate-700 truncate">{p.name}</span>
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
            <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col flex-shrink-0 z-20">
                <div className="p-6 border-b border-slate-100 h-20 flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                        <SlidersHorizontal size={20} />
                    </div>
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Painel Agenda</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <SidebarControls />
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100">
                   <div className="flex items-center gap-2 text-slate-400">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-[9px] font-black uppercase tracking-widest">Sincronizado</span>
                   </div>
                </div>
            </aside>

            {/* CONTEÚDO PRINCIPAL */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* TOPBAR */}
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 flex-shrink-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowMobileSettings(true)} className="lg:hidden p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-orange-50 transition-all"><Settings size={20} /></button>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setCurrentDate(prev => addDays(prev, -1))} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-800 transition-colors"><ChevronLeft size={22} /></button>
                            <div className="flex flex-col items-center min-w-[140px]">
                                <span className="text-sm font-black text-slate-800 capitalize leading-none">{format(currentDate, "EEEE", { locale: pt })}</span>
                                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{format(currentDate, "dd 'de' MMMM", { locale: pt })}</span>
                            </div>
                            <button onClick={() => setCurrentDate(prev => addDays(prev, 1))} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-800 transition-colors"><ChevronRight size={22} /></button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={fetchData} className="hidden sm:flex p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-orange-500 transition-colors"><RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} /></button>
                        <button 
                            onClick={() => setModalState({ type: 'appointment', data: { start: new Date(currentDate.setHours(9,0,0,0)), professional: professionals[0] } })} 
                            className="bg-slate-900 hover:bg-black text-white font-black text-xs py-3 px-6 rounded-2xl shadow-xl flex items-center gap-2 active:scale-95 transition-all"
                        >
                            <Plus size={18} /> <span className="hidden md:inline uppercase tracking-widest">Novo Agendamento</span>
                        </button>
                    </div>
                </header>

                {/* AREA DA GRADE */}
                <div className="flex-1 flex overflow-hidden relative">
                    {isLoading && (
                        <div className="absolute inset-0 z-50 bg-slate-50/50 backdrop-blur-[2px] flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-[32px] shadow-2xl border border-slate-100">
                                {/* FIX: Loader2 is now imported from lucide-react */}
                                <Loader2 className="animate-spin text-orange-500" size={32} />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Carregando Agenda...</p>
                            </div>
                        </div>
                    )}

                    <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide relative bg-slate-50">
                        <div className="inline-grid min-w-full" style={{ gridTemplateColumns: `60px repeat(${visibleProfIds.length}, ${colWidth}px)`, minHeight: '100%' }}>
                            
                            {/* CABEÇALHO DE COLUNAS (FIXO) */}
                            <div className="sticky top-0 z-40 bg-white border-b border-slate-200 h-20"></div>
                            {professionals.filter(p => visibleProfIds.includes(p.id)).map((prof) => (
                                <div key={prof.id} className="sticky top-0 z-40 bg-white border-b border-slate-200 border-r border-slate-100 flex flex-col items-center justify-center p-2 group">
                                    <div className="flex items-center gap-3 w-full px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-orange-200 transition-all relative">
                                        <div className="relative">
                                            <img src={prof.avatarUrl} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" alt={prof.name} />
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-[10px] font-black text-slate-800 truncate leading-tight uppercase">{prof.name.split(' ')[0]}</span>
                                            <span className="text-[8px] font-bold text-slate-400 truncate uppercase tracking-widest">{prof.role || 'PRO'}</span>
                                        </div>
                                        {/* Reordenar Desktop */}
                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-50">
                                            <button onClick={(e) => { e.stopPropagation(); handleMoveColumn(prof, 'left'); }} className="p-1 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-orange-500 shadow-xl"><ArrowLeft size={10} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleMoveColumn(prof, 'right'); }} className="p-1 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-orange-500 shadow-xl"><ArrowRight size={10} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* COLUNA DE HORÁRIOS */}
                            <div className="relative border-r border-slate-200 bg-white z-20">
                                {timeSlots.map(time => (
                                    <div key={time} className="h-10 text-right pr-3 text-[10px] text-slate-400 font-black pt-1.5 border-b border-slate-100/50 border-dashed">
                                        <span>{time}</span>
                                    </div>
                                ))}
                            </div>

                            {/* CÉLULAS DA GRADE POR PROFISSIONAL */}
                            {professionals.filter(p => visibleProfIds.includes(p.id)).map(prof => (
                                <div key={prof.id} className="relative border-r border-slate-100 min-h-full">
                                    {/* Slot Clickable */}
                                    {timeSlots.map((time, i) => (
                                        <div 
                                            key={i} 
                                            onClick={() => {
                                                const [h, m] = time.split(':').map(Number);
                                                const start = new Date(currentDate);
                                                start.setHours(h, m, 0, 0);
                                                setModalState({ type: 'appointment', data: { start, professional: prof } });
                                            }}
                                            className="h-10 border-b border-slate-100/30 border-dashed cursor-cell hover:bg-orange-50/20 transition-colors"
                                        ></div>
                                    ))}

                                    {/* CARDS DE AGENDAMENTO */}
                                    {appointments.filter(app => Number(app.professional.id) === prof.id).map(app => {
                                        const duration = differenceInMinutes(app.end, app.start);
                                        const isOnline = (app as any).origem === 'link';
                                        const isBlock = app.status === 'bloqueado';

                                        return (
                                            <div
                                                key={app.id}
                                                ref={(el) => { appointmentRefs.current.set(app.id, el); }}
                                                onClick={(e) => { e.stopPropagation(); setActiveDetail(app); }}
                                                style={getAppStyle(app)}
                                                className={`absolute left-1/2 -translate-x-1/2 w-[94%] rounded-2xl shadow-lg p-2 cursor-pointer hover:scale-[1.03] hover:shadow-2xl transition-all z-10 overflow-hidden text-white flex flex-col justify-center border border-white/20 ${isBlock ? 'pattern-diagonal-lines-sm opacity-60' : ''}`}
                                            >
                                                {/* INDICADOR ONLINE (MUITO IMPORTANTE) */}
                                                {isOnline && !isBlock && (
                                                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1" title="Agendado via Link Público">
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-300"></span>
                                                        </span>
                                                        <Globe size={10} className="text-white/80" />
                                                    </div>
                                                )}

                                                <p className="font-black truncate text-[11px] uppercase leading-none mb-0.5">{app.client?.nome || 'BLOQUEIO'}</p>
                                                {duration >= 30 && <p className="text-[10px] font-bold truncate opacity-80 leading-tight">{app.service.name}</p>}
                                                
                                                {duration >= 60 && (
                                                    <div className="flex items-center gap-1 mt-1 opacity-60">
                                                        <Clock size={8} />
                                                        <span className="text-[8px] font-black">{format(app.start, 'HH:mm')} - {format(app.end, 'HH:mm')}</span>
                                                    </div>
                                                )}
                                                
                                                {isBlock && <Lock size={12} className="absolute bottom-2 right-2 opacity-30" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DE AJUSTES MOBILE (DRAWER) */}
            {showMobileSettings && (
                <div className="fixed inset-0 z-[100] flex items-end lg:hidden animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileSettings(false)}></div>
                    <div className="relative w-full bg-white rounded-t-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-xl text-orange-600"><SlidersHorizontal size={20}/></div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Ajustes da Agenda</h3>
                            </div>
                            <button onClick={() => setShowMobileSettings(false)} className="p-2 bg-slate-50 text-slate-400 rounded-full"><X size={24}/></button>
                        </div>
                        <SidebarControls />
                    </div>
                </div>
            )}

            {/* MODAIS DE FLUXO */}
            {modalState?.type === 'appointment' && (
                <AppointmentModal 
                    appointment={modalState.data} 
                    onClose={() => setModalState(null)} 
                    onSave={handleSaveAppointment} 
                />
            )}
            
            {activeDetail && (
                <AppointmentDetailPopover 
                    appointment={activeDetail} 
                    targetElement={appointmentRefs.current.get(activeDetail.id) || null} 
                    onClose={() => setActiveDetail(null)} 
                    onEdit={(app) => setModalState({ type: 'appointment', data: app })} 
                    onDelete={async (id) => { 
                        if(window.confirm("Remover este agendamento permanentemente?")){ 
                            const { error } = await supabase.from('appointments').delete().eq('id', id); 
                            if(!error) {
                                fetchData(); 
                                setActiveDetail(null); 
                            }
                        }
                    }} 
                    onUpdateStatus={async (id, status) => { 
                        const { error } = await supabase.from('appointments').update({ status }).eq('id', id); 
                        if(!error) {
                            fetchData(); 
                            setActiveDetail(null); 
                        }
                    }} 
                />
            )}
        </div>
    );
};

export default AtendimentosView;
