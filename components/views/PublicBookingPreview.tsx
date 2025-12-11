
import React, { useState, useMemo } from 'react';
import { services, professionals, mockOnlineConfig } from '../../data/mockData';
import { 
    ChevronLeft, Calendar, Clock, Check, MapPin, Star, 
    Search, Heart, Info, Image as ImageIcon, ChevronDown, ChevronUp, Share2 
} from 'lucide-react';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LegacyService } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

// --- Types for the Wizard ---
type Step = 'service' | 'professional' | 'datetime' | 'form' | 'success';

const PublicBookingPreview: React.FC = () => {
    const [step, setStep] = useState<Step>('service');
    const [selectedService, setSelectedService] = useState<number | null>(null);
    const [selectedProfessional, setSelectedProfessional] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [clientForm, setClientForm] = useState({ name: '', phone: '', notes: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const { user } = useAuth();
    
    // Accordion state for categories
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        'Mais Agendados': true,
        'Sobrancelhas': true,
        'Cílios': false,
        'Estética': false,
        'Geral': false
    });

    // Helper to get objects from IDs
    const serviceObj = useMemo(() => Object.values(services).find(s => s.id === selectedService), [selectedService]);
    const profObj = useMemo(() => professionals.find(p => p.id === selectedProfessional), [selectedProfessional]);

    // Data Filtering & Grouping
    const groupedServices = useMemo<Record<string, LegacyService[]>>(() => {
        const allServices = Object.values(services);
        const filtered = allServices.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const groups: Record<string, LegacyService[]> = {};
        
        // Mock "Mais Agendados" - taking first 3
        if (!searchTerm) {
            groups['Mais Agendados'] = allServices.slice(0, 3);
        }

        filtered.forEach(service => {
            const cat = service.category || 'Geral';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(service);
        });

        return groups;
    }, [searchTerm]);

    // Mock Time Slots Generation
    const timeSlots = useMemo(() => {
        const slots = [];
        const start = 9; // 9 AM
        const end = 18; // 6 PM
        for (let i = start; i < end; i++) {
            slots.push(`${String(i).padStart(2, '0')}:00`);
            slots.push(`${String(i).padStart(2, '0')}:30`);
        }
        return slots;
    }, []);

    // Date Picker Helper - Generate next 14 days
    const dates = useMemo(() => {
        return Array.from({ length: 14 }, (_, i) => addDays(startOfToday(), i));
    }, []);

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    const handleSelectService = (id: number) => {
        setSelectedService(id);
        // Small delay for visual feedback
        setTimeout(() => setStep('professional'), 200);
    };

    const handleNext = () => {
        if (step === 'service' && selectedService) setStep('professional');
        else if (step === 'professional' && selectedProfessional) setStep('datetime');
        else if (step === 'datetime' && selectedTime) setStep('form');
        else if (step === 'form' && clientForm.name && clientForm.phone) setStep('success');
    };

    const handleBack = () => {
        if (step === 'professional') setStep('service');
        else if (step === 'datetime') setStep('professional');
        else if (step === 'form') setStep('datetime');
    };

    const handleExitPreview = () => {
        window.location.hash = ''; // Return to dashboard handled by App.tsx
    };

    // --- RENDERERS ---

    const BackToAdminButton = () => (
        user ? (
            <div className="fixed top-4 left-4 z-50">
                <button 
                    onClick={handleExitPreview} 
                    className="bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold hover:bg-slate-700 transition-colors border border-slate-600"
                >
                    <ChevronLeft size={14} /> Voltar ao Admin
                </button>
            </div>
        ) : null
    );

    if (step === 'success') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans relative">
                <BackToAdminButton />
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Agendamento Confirmado!</h2>
                    <p className="text-slate-600 mb-6">
                        Obrigado, <b>{clientForm.name}</b>. Seu horário para <b>{serviceObj?.name}</b> com <b>{profObj?.name}</b> está reservado.
                    </p>
                    
                    <div className="bg-slate-50 p-4 rounded-xl text-left mb-6 border border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <span className="font-semibold text-slate-700">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-slate-500" />
                            <span className="font-semibold text-slate-700">{selectedTime}</span>
                        </div>
                    </div>

                    <button className="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition shadow-lg shadow-green-200 mb-3">
                        Receber comprovante no WhatsApp
                    </button>
                    <button 
                        onClick={() => window.location.reload()}
                        className="text-slate-500 font-medium hover:text-slate-800 text-sm"
                    >
                        Fazer outro agendamento
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] font-sans pb-20 relative">
            <BackToAdminButton />
            
            {/* --- HEADER (Reference Style) --- */}
            <header className="bg-white pt-6 pb-4 px-4 shadow-sm sticky top-0 z-20">
                <div className="max-w-3xl mx-auto">
                    {step === 'service' ? (
                        /* Studio Profile Header */
                        <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-4 mb-4 mt-8 md:mt-0">
                            <div className="relative">
                                <img src={mockOnlineConfig.logoUrl} alt="Logo" className="w-24 h-24 rounded-full border border-slate-100 shadow-sm object-cover" />
                                <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-2 border-white rounded-full" title="Aberto Agora"></div>
                            </div>
                            <div className="flex-1">
                                <h1 className="text-xl font-bold text-slate-800">{mockOnlineConfig.studioName}</h1>
                                <p className="text-xs text-slate-500 mt-1">Avenida Santina Gomes de Andrade, 4 - Loja 04, Centro</p>
                                <div className="flex items-center justify-center md:justify-start gap-1 text-amber-500 text-sm font-bold mt-2">
                                    <Star className="w-4 h-4 fill-current" /> 5.0 <span className="text-amber-600 font-normal">- Ótimo</span> <span className="text-slate-400 font-normal ml-1">(4 avaliações)</span>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex items-center justify-center md:justify-start gap-4 mt-4 text-xs font-semibold text-slate-600">
                                    <button className="flex items-center gap-1 hover:text-orange-500 transition-colors"><ImageIcon size={16}/> Fotos</button>
                                    <button className="flex items-center gap-1 hover:text-orange-500 transition-colors"><Info size={16}/> Informações</button>
                                    <button className="flex items-center gap-1 hover:text-orange-500 transition-colors"><Heart size={16}/> Favorito</button>
                                    <button className="flex items-center gap-1 hover:text-orange-500 transition-colors"><Share2 size={16}/> Compartilhar</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Navigation Header (Steps 2-4) */
                        <div className="flex items-center justify-between py-2 mt-8 md:mt-0">
                            <button onClick={handleBack} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full">
                                <ChevronLeft />
                            </button>
                            <span className="font-semibold text-slate-800">
                                {step === 'professional' && 'Escolha o Profissional'}
                                {step === 'datetime' && 'Data e Horário'}
                                {step === 'form' && 'Finalizar Agendamento'}
                            </span>
                            <div className="w-8"></div>
                        </div>
                    )}

                    {/* Progress Bar (Steps 2-4) */}
                    {step !== 'service' && (
                        <div className="h-1 bg-slate-100 w-full mt-2 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-orange-500 transition-all duration-300"
                                style={{ width: step === 'professional' ? '33%' : step === 'datetime' ? '66%' : '100%' }}
                            ></div>
                        </div>
                    )}
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 mt-6">
                
                {/* --- STEP 1: SERVICE SELECTION (Catalog Style) --- */}
                {step === 'service' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input 
                                type="text" 
                                placeholder="Pesquisar Serviço..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-xl text-slate-700 focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all outline-none"
                            />
                        </div>

                        {/* Service List by Category */}
                        {Object.entries(groupedServices).map(([category, items]) => (
                            <div key={category} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                                {/* Accordion Header */}
                                <button 
                                    onClick={() => toggleCategory(category)}
                                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
                                >
                                    <h3 className="font-bold text-slate-800 text-sm md:text-base">{category}</h3>
                                    {expandedCategories[category] ? <ChevronUp className="text-slate-400 w-5 h-5" /> : <ChevronDown className="text-slate-400 w-5 h-5" />}
                                </button>

                                {/* List Items */}
                                {expandedCategories[category] && (
                                    <div className="divide-y divide-slate-100">
                                        {(items as LegacyService[]).map(service => (
                                            <div key={service.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-orange-500 flex-shrink-0"></div>
                                                    <div>
                                                        <p className="font-semibold text-slate-700 text-sm md:text-base">{service.name}</p>
                                                        {/* Optional Description */}
                                                        {/* <p className="text-xs text-slate-400 mt-1 line-clamp-2">Descrição detalhada do serviço aqui...</p> */}
                                                    </div>
                                                </div>
                                                
                                                <div className="text-right flex flex-col items-end gap-2 min-w-[80px]">
                                                    <div>
                                                        <span className="block text-sm font-bold text-slate-600">R$ {service.price.toFixed(2)}</span>
                                                        <span className="block text-[10px] text-slate-400">{service.duration}m</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleSelectService(service.id)}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-4 rounded-lg shadow-sm transition-colors"
                                                    >
                                                        Selecionar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {Object.keys(groupedServices).length === 0 && (
                            <div className="text-center py-10 text-slate-400">
                                <p>Nenhum serviço encontrado.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* --- STEP 2: PROFESSIONAL --- */}
                {step === 'professional' && (
                    <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl mb-4">
                            <p className="text-sm text-orange-800">
                                Serviço selecionado: <b>{serviceObj?.name}</b> (R$ {serviceObj?.price.toFixed(2)})
                            </p>
                        </div>

                        <button
                            onClick={() => { setSelectedProfessional(-1); setStep('datetime'); }}
                            className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-orange-300 transition-all group"
                        >
                             <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                ?
                             </div>
                             <div className="text-left">
                                 <h3 className="font-bold text-slate-800 text-lg">Qualquer profissional</h3>
                                 <p className="text-xs text-slate-500">Encontraremos o horário mais próximo</p>
                             </div>
                        </button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {professionals.map(prof => (
                                <button
                                    key={prof.id}
                                    onClick={() => { setSelectedProfessional(prof.id); setStep('datetime'); }}
                                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-orange-300 transition-all text-left"
                                >
                                    <img src={prof.avatarUrl} alt={prof.name} className="w-14 h-14 rounded-full object-cover border-2 border-slate-100" />
                                    <div>
                                        <h3 className="font-bold text-slate-800">{prof.name}</h3>
                                        <p className="text-xs text-slate-500">Especialista</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <Star className="w-3 h-3 text-amber-400 fill-current" />
                                            <span className="text-xs font-bold text-slate-600">4.9</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- STEP 3: DATE & TIME --- */}
                {step === 'datetime' && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                        {/* Horizontal Date Picker */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h2 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">Escolha uma data</h2>
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {dates.map(date => {
                                    const selected = isSameDay(date, selectedDate);
                                    return (
                                        <button
                                            key={date.toISOString()}
                                            onClick={() => setSelectedDate(date)}
                                            className={`flex-shrink-0 w-14 h-20 rounded-xl flex flex-col items-center justify-center border transition-all ${
                                                selected 
                                                ? 'bg-slate-800 text-white border-slate-800 shadow-lg scale-105' 
                                                : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100'
                                            }`}
                                        >
                                            <span className="text-[10px] font-bold uppercase">{format(date, 'EEE', { locale: ptBR })}</span>
                                            <span className="text-xl font-bold">{format(date, 'dd')}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Time Slots Grid */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                             <h2 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">Horários disponíveis</h2>
                             <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                {timeSlots.map(time => (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedTime(time)}
                                        className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                                            selectedTime === time
                                            ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600'
                                        }`}
                                    >
                                        {time}
                                    </button>
                                ))}
                             </div>
                        </div>
                        
                        <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-slate-200 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <div className="max-w-3xl mx-auto">
                                <button 
                                    onClick={handleNext}
                                    disabled={!selectedTime}
                                    className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-900 transition flex items-center justify-center gap-2"
                                >
                                    Continuar para Dados
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- STEP 4: FORM --- */}
                {step === 'form' && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300 pb-24">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Resumo do Agendamento</h3>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Serviço</span>
                                <span className="font-bold text-slate-800">{serviceObj?.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Profissional</span>
                                <span className="font-bold text-slate-800">{selectedProfessional === -1 ? 'Qualquer disponível' : profObj?.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Data e Hora</span>
                                <span className="font-bold text-slate-800">{format(selectedDate, "dd/MM", { locale: ptBR })} às {selectedTime}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                                <span className="text-slate-500 font-bold">Total Estimado</span>
                                <span className="font-bold text-green-600 text-lg">R$ {serviceObj?.price.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <h2 className="font-bold text-slate-800">Seus dados</h2>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                                <input 
                                    type="text" 
                                    value={clientForm.name}
                                    onChange={(e) => setClientForm({...clientForm, name: e.target.value})}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none bg-slate-50 focus:bg-white transition-all"
                                    placeholder="Como gostaria de ser chamado(a)?"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp / Celular</label>
                                <input 
                                    type="tel" 
                                    value={clientForm.phone}
                                    onChange={(e) => setClientForm({...clientForm, phone: e.target.value})}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none bg-slate-50 focus:bg-white transition-all"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações (Opcional)</label>
                                <textarea 
                                    value={clientForm.notes}
                                    onChange={(e) => setClientForm({...clientForm, notes: e.target.value})}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none bg-slate-50 focus:bg-white h-24 resize-none transition-all"
                                    placeholder="Tem alguma alergia ou preferência?"
                                />
                            </div>
                        </div>

                        <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-slate-200 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                             <div className="max-w-3xl mx-auto">
                                <button 
                                    onClick={handleNext}
                                    disabled={!clientForm.name || !clientForm.phone}
                                    className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition shadow-lg shadow-green-200"
                                >
                                    Confirmar Agendamento
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicBookingPreview;
