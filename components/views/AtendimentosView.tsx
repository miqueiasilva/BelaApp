
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { initialAppointments, professionals as mockProfessionals } from '../../data/mockData';
import { LegacyAppointment, LegacyProfessional, AppointmentStatus, FinancialTransaction } from '../../types';
import { format, setHours, setMinutes, startOfDay, roundToNearestMinutes } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Edit, Lock, Trash2, MessageSquare, ShoppingCart, FileText } from 'lucide-react';

import AppointmentModal from '../modals/AppointmentModal';
import BlockTimeModal from '../modals/BlockTimeModal';
import ContextMenu from '../shared/ContextMenu';
import JaciBotPanel from '../JaciBotPanel';
import AppointmentDetailPopover from '../shared/AppointmentDetailPopover';
import Toast, { ToastType } from '../shared/Toast';

const START_HOUR = 8;
const PIXELS_PER_MINUTE = 80 / 60; // 80px for every 60 minutes

// --- Helper Components (some could be moved to separate files) ---

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
                <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-red-500 rounded-full"></div>
            </div>
        </div>
    );
};


// --- Main View Component ---

interface AtendimentosViewProps {
    onAddTransaction: (t: FinancialTransaction) => void;
}

const AtendimentosView: React.FC<AtendimentosViewProps> = ({ onAddTransaction }) => {
    // --- State Management ---
    const [appointments, setAppointments] = useState<LegacyAppointment[]>(initialAppointments);
    const [visibleProfIds, setVisibleProfIds] = useState<number[]>(mockProfessionals.map(p => p.id));
    
    const [modalState, setModalState] = useState<{ type: 'appointment' | 'block'; data: any } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; options: any[] } | null>(null);
    const [activeAppointmentDetail, setActiveAppointmentDetail] = useState<LegacyAppointment | null>(null);
    const [isJaciBotOpen, setIsJaciBotOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const appointmentRefs = useRef(new Map<number, HTMLDivElement | null>());

    // --- Effects ---
    useEffect(() => {
        // Scroll to the top of the calendar grid on initial render
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, []);

    // --- Memoized Values ---
    const visibleProfessionals = useMemo(() =>
        mockProfessionals.filter(p => visibleProfIds.includes(p.id)),
        [visibleProfIds]
    );

    const timeSlots = useMemo(() => Array.from({ length: 22 }, (_, i) => { // From 08:00 to 19:00
        const hour = START_HOUR + Math.floor(i / 2);
        const minute = (i % 2) * 30;
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }), []);

    // --- Event Handlers ---
    const showToast = (message: string, type: ToastType = 'success') => {
        setToast({ message, type });
    };

    const handleToggleProfessional = (id: number) => {
        setVisibleProfIds(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    const handleSaveAppointment = (app: LegacyAppointment) => {
        let isNew = false;
        setAppointments(prev => {
            const existing = prev.find(a => a.id === app.id);
            if (existing) {
                return prev.map(a => a.id === app.id ? app : a);
            }
            isNew = true;
            return [...prev, { ...app, id: Date.now() }];
        });
        setModalState(null);
        showToast(isNew ? 'Agendamento criado com sucesso!' : 'Agendamento atualizado com sucesso!', 'success');
    };
    
    const handleDeleteAppointment = (id: number) => {
        if (window.confirm("Tem certeza que deseja excluir este agendamento?")) {
            setAppointments(prev => prev.filter(a => a.id !== id));
            setActiveAppointmentDetail(null);
            showToast('Agendamento removido.', 'info');
        }
    };
    
    const handleStatusUpdate = (appointmentId: number, newStatus: AppointmentStatus) => {
        setAppointments(prev =>
            prev.map(app => (app.id === appointmentId ? { ...app, status: newStatus } : app))
        );
        showToast(`Status alterado para ${newStatus.replace('_', ' ')}`, 'success');
    };
    
    const handleEditAppointment = (app: LegacyAppointment) => {
        setModalState({ type: 'appointment', data: app });
    };


    const handleContextMenu = (e: React.MouseEvent, professional: LegacyProfessional) => {
        e.preventDefault();
        const gridEl = e.currentTarget as HTMLElement;
        const rect = gridEl.getBoundingClientRect();
        const y = e.clientY - rect.top;
        
        const minutesFromTop = y / PIXELS_PER_MINUTE;
        const totalMinutes = minutesFromTop + START_HOUR * 60;
        
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;

        const clickedTime = setMinutes(setHours(startOfDay(new Date()), hour), minute);
        const roundedTime = roundToNearestMinutes(clickedTime, { nearestTo: 15 });

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            options: [
                { label: 'Novo Agendamento', icon: <Plus size={16}/>, onClick: () => setModalState({ type: 'appointment', data: { professional, start: roundedTime } }) },
                { label: 'Venda de Produtos', icon: <ShoppingCart size={16}/>, onClick: () => showToast('Funcionalidade de Venda de Produtos a ser implementada.', 'info') },
                { label: 'Bloquear Horário', icon: <Lock size={16}/>, onClick: () => setModalState({ type: 'block', data: { professional, startTime: roundedTime } }) },
            ],
        });
    };
    
    const createAppointmentContextMenu = (e: React.MouseEvent, app: LegacyAppointment) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            options: [
                { label: 'Editar', icon: <Edit size={16}/>, onClick: () => setModalState({ type: 'appointment', data: app }) },
                { label: 'Excluir', icon: <Trash2 size={16}/>, className: 'text-red-600', onClick: () => handleDeleteAppointment(app.id) },
            ],
        });
    }

    return (
        <div className="flex h-full bg-white">
            {toast && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}

            {/* Settings Panel */}
            <aside className="w-[260px] flex-shrink-0 border-r border-slate-200 p-4 flex flex-col">
                <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-3">CONFIGURAÇÕES</div>
                 <div className="flex justify-between items-baseline mb-2">
                    <label className="text-sm font-semibold text-slate-700">Profissionais</label>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setVisibleProfIds(mockProfessionals.map(p => p.id))} className="text-xs font-semibold text-orange-600 hover:underline">Todos</button>
                        <button onClick={() => setVisibleProfIds([])} className="text-xs font-semibold text-slate-500 hover:underline">Nenhum</button>
                    </div>
                </div>
                <div className="space-y-2">
                    {mockProfessionals.map(prof => (
                        <div key={prof.id} className="flex items-center">
                            <input
                                type="checkbox"
                                id={`prof-${prof.id}`}
                                checked={visibleProfIds.includes(prof.id)}
                                onChange={() => handleToggleProfessional(prof.id)}
                                className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                            />
                            <label htmlFor={`prof-${prof.id}`} className="ml-2 block text-sm text-slate-800 cursor-pointer">{prof.name}</label>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <header className="flex-shrink-0 h-16 flex items-center justify-between px-6 border-b border-slate-200">
                     <div className="flex items-center gap-2">
                        <button className="p-1 rounded hover:bg-slate-100 text-slate-500"><ChevronLeft size={20} /></button>
                        <h2 className="text-base font-semibold text-slate-700">HOJE</h2>
                        <span className="text-base font-semibold text-slate-700">Seg, 03/Novembro/2025</span>
                        <button className="p-1 rounded hover:bg-slate-100 text-slate-500"><ChevronRight size={20} /></button>
                    </div>
                    <button onClick={() => setModalState({ type: 'appointment', data: { start: new Date() } })} className="px-4 py-2 text-sm font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-sm shadow-orange-200">
                        <Plus size={16} />
                        Agendar
                    </button>
                </header>
                
                <div ref={scrollContainerRef} className="flex-1 overflow-auto">
                    <div className="relative">
                        <div className="sticky top-0 bg-white z-20 grid" style={{ gridTemplateColumns: `80px repeat(${visibleProfessionals.length}, 1fr)` }}>
                            <div className="border-b border-r border-slate-200 h-14"></div>
                            {visibleProfessionals.map(prof => (
                                <div key={prof.id} className="flex items-center gap-2 p-2 border-b border-r border-slate-200 h-14">
                                    <img src={prof.avatarUrl} alt={prof.name} className="w-8 h-8 rounded-full" />
                                    <span className="text-sm font-semibold text-slate-800">{prof.name}</span>
                                </div>
                            ))}
                        </div>

                        <div className="grid relative pt-2" style={{ gridTemplateColumns: `80px repeat(${visibleProfessionals.length}, 1fr)` }}>
                            <div className="border-r border-slate-200">
                                {timeSlots.map(time => (
                                    <div key={time} className="h-10 text-right pr-2 text-xs text-slate-500 relative">
                                        <span className="absolute -top-[7px] right-2">{time}</span>
                                    </div>
                                ))}
                            </div>

                            {visibleProfessionals.map(prof => (
                                <div key={prof.id} className="relative border-r border-slate-200" onContextMenu={(e) => handleContextMenu(e, prof)}>
                                    {timeSlots.map((_, index) => (
                                        <div key={index} className="h-10 border-b border-dashed border-slate-200"></div>
                                    ))}

                                    {appointments
                                        .filter(app => app.professional.id === prof.id)
                                        .map(app => (
                                        <div
                                            key={app.id}
                                            ref={(el) => { appointmentRefs.current.set(app.id, el); }}
                                            title={`${app.service.name}\n- Duração: ${app.service.duration} min\n- Preço: R$ ${app.service.price.toFixed(2)}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (app.status !== 'bloqueado') {
                                                   setActiveAppointmentDetail(app);
                                                }
                                            }}
                                            onContextMenu={(e) => createAppointmentContextMenu(e, app)}
                                            className={`absolute w-[95%] left-1/2 -translate-x-1/2 p-1.5 pl-3 rounded-lg border text-[11px] leading-tight overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${getStatusColor(app.status)}`}
                                            style={getAppointmentStyle(app.start, app.end)}
                                        >
                                            <div style={{ backgroundColor: app.service.color }} className="absolute left-0 top-0 bottom-0 w-1"></div>
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold truncate">{format(app.start, 'HH:mm')} - {format(app.end, 'HH:mm')}</p>
                                                {app.notas && <FileText size={12} className="text-slate-500 flex-shrink-0 ml-1" title={app.notas}/>}
                                            </div>
                                            {app.client && <p className="font-semibold truncate">{app.client.nome}</p>}
                                            <p className="truncate">{app.service.name}</p>
                                            {app.status === 'confirmado_whatsapp' && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500"></div>}
                                        </div>
                                    ))}
                                </div>
                            ))}
                            <TimelineIndicator />
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals and Overlays */}
            {modalState?.type === 'appointment' && (
                <AppointmentModal 
                    key={modalState.data.id || 'new'}
                    appointment={modalState.data}
                    onClose={() => setModalState(null)}
                    onSave={handleSaveAppointment}
                />
            )}
            {modalState?.type === 'block' && (
                <BlockTimeModal
                    professional={modalState.data.professional}
                    startTime={modalState.data.startTime}
                    onClose={() => setModalState(null)}
                    onSave={handleSaveAppointment}
                />
            )}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    options={contextMenu.options}
                    onClose={() => setContextMenu(null)}
                />
            )}
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
            <div className="absolute bottom-6 right-6 z-30">
              <button onClick={() => setIsJaciBotOpen(true)} className="w-14 h-14 bg-orange-500 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-orange-600 transition ring-2 ring-white hover:scale-110 duration-200">
                <MessageSquare className="w-7 h-7" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center border-2 border-white">3</span>
              </button>
            </div>
        </div>
    );
};

export default AtendimentosView;
