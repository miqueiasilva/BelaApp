
import React, { useState, useMemo } from 'react';
import { services, professionals, mockOnlineConfig } from '../../data/mockData';
import { ChevronLeft, Calendar, Clock, Check, MapPin, Star, ArrowRight } from 'lucide-react';
import { format, addDays, startOfToday, isSameDay, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Types for the Wizard ---
type Step = 'service' | 'professional' | 'datetime' | 'form' | 'success';

const PublicBookingPreview: React.FC = () => {
    const [step, setStep] = useState<Step>('service');
    const [selectedService, setSelectedService] = useState<number | null>(null);
    const [selectedProfessional, setSelectedProfessional] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [clientForm, setClientForm] = useState({ name: '', phone: '', notes: '' });

    // Helper to get objects from IDs
    const serviceObj = useMemo(() => Object.values(services).find(s => s.id === selectedService), [selectedService]);
    const profObj = useMemo(() => professionals.find(p => p.id === selectedProfessional), [selectedProfessional]);

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

    if (step === 'success') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
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
                        onClick={() => window.location.reload()} // Simple reset for preview
                        className="text-slate-500 font-medium hover:text-slate-800 text-sm"
                    >
                        Fazer outro agendamento
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Sticky Header Mobile */}
            <div className="bg-white shadow-sm sticky top-0 z-20">
                <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
                    {step !== 'service' ? (
                        <button onClick={handleBack} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full">
                            <ChevronLeft />
                        </button>
                    ) : (
                        <div className="w-10"></div> // Spacer
                    )}
                    <span className="font-semibold text-slate-800">Agendamento Online</span>
                    <div className="w-10 text-right text-xs font-bold text-orange-500">
                        {step === 'service' && '1/4'}
                        {step === 'professional' && '2/4'}
                        {step === 'datetime' && '3/4'}
                        {step === 'form' && '4/4'}
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="h-1 bg-slate-100 w-full">
                    <div 
                        className="h-full bg-orange-500 transition-all duration-300"
                        style={{ width: step === 'service' ? '25%' : step === 'professional' ? '50%' : step === 'datetime' ? '75%' : '100%' }}
                    ></div>
                </div>
            </div>

            <div className="max-w-md mx-auto pb-20">
                
                {/* Hero Info (Only on first step) */}
                {step === 'service' && (
                    <div className="bg-white p-6 mb-4">
                        <div className="flex items-center gap-4 mb-4">
                            <img src={mockOnlineConfig.logoUrl} alt="Logo" className="w-16 h-16 rounded-full border border-slate-100 shadow-sm" />
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 leading-tight">{mockOnlineConfig.studioName}</h1>
                                <div className="flex items-center gap-1 text-amber-500 text-sm font-bold mt-1">
                                    <Star className="w-4 h-4 fill-current" /> 4.9 <span className="text-slate-400 font-normal ml-1">(120 avaliações)</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed mb-3">{mockOnlineConfig.description}</p>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <MapPin className="w-4 h-4" />
                            <span>São Paulo, SP</span>
                        </div>
                    </div>
                )}

                {/* Step 1: Services */}
                {step === 'service' && (
                    <div className="px-4 space-y-3">
                        <h2 className="font-bold text-slate-700 mb-2">Selecione um serviço</h2>
                        {Object.values(services).map(service => (
                            <button
                                key={service.id}
                                onClick={() => { setSelectedService(service.id); setTimeout(() => setStep('professional'), 200); }}
                                className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-orange-300 hover:shadow-md transition-all group"
                            >
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-800 group-hover:text-orange-600 transition-colors">{service.name}</h3>
                                    <p className="text-xs text-slate-500 mt-1">{service.duration} min • <span className="font-medium text-slate-700">R$ {service.price.toFixed(2)}</span></p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 2: Professionals */}
                {step === 'professional' && (
                    <div className="px-4 space-y-3 pt-4">
                        <h2 className="font-bold text-slate-700 mb-2">Quem vai te atender?</h2>
                        <button
                            onClick={() => { setSelectedProfessional(-1); setStep('datetime'); }} // -1 for "Any"
                            className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-orange-300 transition-all"
                        >
                             <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg">
                                ?
                             </div>
                             <div className="text-left">
                                 <h3 className="font-bold text-slate-800">Qualquer profissional disponível</h3>
                                 <p className="text-xs text-slate-500">Encontraremos o horário mais próximo</p>
                             </div>
                        </button>
                        
                        {professionals.map(prof => (
                            <button
                                key={prof.id}
                                onClick={() => { setSelectedProfessional(prof.id); setStep('datetime'); }}
                                className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-orange-300 transition-all"
                            >
                                <img src={prof.avatarUrl} alt={prof.name} className="w-12 h-12 rounded-full object-cover" />
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-800">{prof.name}</h3>
                                    <p className="text-xs text-slate-500">Especialista em Cílios e Sobrancelhas</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 3: Date & Time */}
                {step === 'datetime' && (
                    <div className="px-4 pt-4 space-y-6">
                        {/* Horizontal Date Picker */}
                        <div>
                            <h2 className="font-bold text-slate-700 mb-3">Escolha uma data</h2>
                            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                                {dates.map(date => {
                                    const selected = isSameDay(date, selectedDate);
                                    return (
                                        <button
                                            key={date.toISOString()}
                                            onClick={() => setSelectedDate(date)}
                                            className={`flex-shrink-0 w-16 h-20 rounded-xl flex flex-col items-center justify-center border transition-all ${
                                                selected 
                                                ? 'bg-slate-800 text-white border-slate-800 shadow-lg scale-105' 
                                                : 'bg-white text-slate-600 border-slate-200'
                                            }`}
                                        >
                                            <span className="text-xs font-medium uppercase">{format(date, 'EEE', { locale: ptBR })}</span>
                                            <span className="text-xl font-bold">{format(date, 'dd')}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Time Slots Grid */}
                        <div>
                             <h2 className="font-bold text-slate-700 mb-3">Horários disponíveis</h2>
                             <div className="grid grid-cols-4 gap-3">
                                {timeSlots.map(time => (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedTime(time)}
                                        className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                                            selectedTime === time
                                            ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                                            : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
                                        }`}
                                    >
                                        {time}
                                    </button>
                                ))}
                             </div>
                        </div>
                        
                        <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-slate-200 z-20">
                            <div className="max-w-md mx-auto">
                                <button 
                                    onClick={handleNext}
                                    disabled={!selectedTime}
                                    className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-900 transition"
                                >
                                    Continuar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Form */}
                {step === 'form' && (
                    <div className="px-4 pt-4 space-y-6">
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6">
                            <h3 className="font-bold text-orange-800 text-sm mb-2">Resumo do Agendamento</h3>
                            <div className="space-y-1 text-sm text-orange-700">
                                <p><b>Serviço:</b> {serviceObj?.name}</p>
                                <p><b>Profissional:</b> {selectedProfessional === -1 ? 'Qualquer disponível' : profObj?.name}</p>
                                <p><b>Data:</b> {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })} às {selectedTime}</p>
                            </div>
                        </div>

                        <div>
                            <h2 className="font-bold text-slate-700 mb-4">Seus dados</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-1">Nome Completo</label>
                                    <input 
                                        type="text" 
                                        placeholder="Seu nome"
                                        value={clientForm.name}
                                        onChange={(e) => setClientForm({...clientForm, name: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-1">WhatsApp / Celular</label>
                                    <input 
                                        type="tel" 
                                        placeholder="(00) 00000-0000"
                                        value={clientForm.phone}
                                        onChange={(e) => setClientForm({...clientForm, phone: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-1">Observações (Opcional)</label>
                                    <textarea 
                                        placeholder="Alguma preferência ou restrição?"
                                        value={clientForm.notes}
                                        onChange={(e) => setClientForm({...clientForm, notes: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white h-24 resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-slate-200 z-20">
                             <div className="max-w-md mx-auto">
                                <button 
                                    onClick={handleNext}
                                    disabled={!clientForm.name || !clientForm.phone}
                                    className="w-full bg-green-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition shadow-lg shadow-green-200"
                                >
                                    Confirmar Agendamento
                                </button>
                                <p className="text-center text-xs text-slate-400 mt-2">Ao confirmar, você concorda com a política de cancelamento.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicBookingPreview;
