
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    ChevronLeft, User, Save, Trash2, Camera, Scissors, 
    Loader2, Shield, Clock, DollarSign, CheckCircle, AlertCircle
} from 'lucide-react';
import { LegacyProfessional, LegacyService } from '../../types';
import Card from '../shared/Card';
import ToggleSwitch from '../shared/ToggleSwitch';
import Toast, { ToastType } from '../shared/Toast';
import { supabase } from '../../services/supabaseClient';

interface ProfessionalDetailProps {
    professional: LegacyProfessional;
    onBack: () => void;
    onSave: () => void;
}

const DAYS_OF_WEEK = [
    { key: 'monday', label: 'Segunda-feira' },
    { key: 'tuesday', label: 'Terça-feira' },
    { key: 'wednesday', label: 'Quarta-feira' },
    { key: 'thursday', label: 'Quinta-feira' },
    { key: 'friday', label: 'Sexta-feira' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
];

const ProfessionalDetail: React.FC<ProfessionalDetailProps> = ({ professional: initialProf, onBack, onSave }) => {
    const [prof, setProf] = useState<any>(null);
    const [allServices, setAllServices] = useState<LegacyService[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'perfil' | 'servicos' | 'horarios' | 'comissoes' | 'permissoes'>('perfil');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const showToast = useCallback((message: any, type: ToastType = 'success') => {
        const msg = typeof message === 'string' ? message : (message?.message || "Erro desconhecido");
        setToast({ message: msg, type });
    }, []);

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data: svcs } = await supabase.from('services').select('*').order('nome');
                if (svcs) setAllServices(svcs as any);

                const normalized = {
                    ...initialProf,
                    cpf: (initialProf as any).cpf || '',
                    bio: (initialProf as any).bio || '',
                    email: (initialProf as any).email || '',
                    phone: (initialProf as any).phone || '',
                    birth_date: (initialProf as any).birth_date || '',
                    commission_rate: (initialProf as any).commission_rate ?? 30,
                    permissions: (initialProf as any).permissions || { view_calendar: true },
                    services_enabled: (initialProf as any).services_enabled || [],
                    work_schedule: (initialProf as any).work_schedule || {},
                    photo_url: (initialProf as any).photo_url || null
                };
                setProf(normalized);
            } catch (e: any) {
                alert("Erro ao sincronizar dados: " + e.message);
            }
        };
        loadData();
    }, [initialProf]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !prof) return;

        setIsUploading(true);
        try {
            const fileName = `${prof.id}_${Date.now()}.${file.name.split('.').pop()}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            
            setProf({ ...prof, photo_url: publicUrl });
            await supabase.from('professionals').update({ photo_url: publicUrl }).eq('id', prof.id);
            showToast("Foto atualizada!");
        } catch (err: any) {
            alert("Erro no upload: " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!prof) return;
        setIsLoading(true);
        try {
            const payload = {
                name: prof.name,
                role: prof.role,
                phone: prof.phone || null,
                email: prof.email || null,
                cpf: prof.cpf || null,
                bio: prof.bio || null,
                active: !!prof.active,
                birth_date: prof.birth_date === "" ? null : prof.birth_date,
                commission_rate: parseFloat(prof.commission_rate) || 0,
                permissions: prof.permissions,
                services_enabled: prof.services_enabled,
                work_schedule: prof.work_schedule,
                photo_url: prof.photo_url
            };

            const { error } = await supabase.from('professionals').update(payload).eq('id', prof.id);
            if (error) throw error;

            showToast("Perfil atualizado com sucesso!");
            onSave();
        } catch (err: any) {
            alert("Erro ao salvar: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleService = (id: number) => {
        const next = prof.services_enabled.includes(id) ? prof.services_enabled.filter((sId: number) => sId !== id) : [...prof.services_enabled, id];
        setProf({ ...prof, services_enabled: next });
    };

    const updateSchedule = (day: string, field: string, value: any) => {
        const current = prof.work_schedule[day] || { active: false, start: '09:00', end: '18:00' };
        setProf({ ...prof, work_schedule: { ...prof.work_schedule, [day]: { ...current, [field]: value } } });
    };

    if (!prof) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10" /></div>;

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ChevronLeft size={24} /></button>
                    <div><h2 className="text-xl font-bold text-slate-800">{prof.name}</h2><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{prof.role}</p></div>
                </div>
                <div className="flex gap-3">
                    <button onClick={async () => { if(window.confirm("Excluir definitivamente?")){ await supabase.from('professionals').delete().eq('id', prof.id); onBack(); }}} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={20} /></button>
                    <button onClick={handleSave} disabled={isLoading} className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-50">{isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salvar</button>
                </div>
            </header>

            <div className="bg-white border-b border-slate-200 px-8 overflow-x-auto scrollbar-hide">
                <div className="flex gap-8">
                    {[ { id: 'perfil', label: 'Perfil', icon: User }, { id: 'servicos', label: 'Serviços', icon: Scissors }, { id: 'horarios', label: 'Horários', icon: Clock }, { id: 'comissoes', label: 'Comissão', icon: DollarSign }, { id: 'permissoes', label: 'Acessos', icon: Shield } ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 py-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><tab.icon size={16} /> {tab.label}</button>
                    ))}
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
                    {activeTab === 'perfil' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <Card className="h-fit flex flex-col items-center py-8">
                                <div className="w-36 h-36 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-100 relative group cursor-pointer mb-4" onClick={() => fileInputRef.current?.click()}>
                                    {prof.photo_url ? <img src={prof.photo_url} className="w-full h-full object-cover" /> : <User size={56} className="m-10 text-slate-300" />}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">{isUploading ? <Loader2 className="animate-spin text-white" /> : <Camera className="text-white" />}</div>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clique para alterar</p>
                            </Card>
                            <div className="lg:col-span-2 space-y-6">
                                <Card title="Dados Pessoais">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Nome</label><input value={prof.name} onChange={e => setProf({...prof, name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500" /></div>
                                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Cargo</label><input value={prof.role} onChange={e => setProf({...prof, role: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">WhatsApp</label><input value={prof.phone} onChange={e => setProf({...prof, phone: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500" /></div>
                                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Email</label><input type="email" value={prof.email} onChange={e => setProf({...prof, email: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500" /></div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}
                    {activeTab === 'servicos' && (
                        <Card title="Especialidades">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {allServices.map(s => (
                                    <button key={s.id} onClick={() => toggleService(s.id)} className={`p-4 rounded-2xl border-2 transition-all text-left ${prof.services_enabled.includes(s.id) ? 'border-orange-500 bg-orange-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                                        <p className="font-bold text-sm truncate">{s.nome}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase">{s.duracao_min} min</p>
                                    </button>
                                ))}
                            </div>
                        </Card>
                    )}
                    {activeTab === 'horarios' && (
                        <Card title="Grade de Atendimento">
                            <div className="space-y-3">
                                {DAYS_OF_WEEK.map(day => {
                                    const config = prof.work_schedule[day.key] || { active: false, start: '09:00', end: '18:00' };
                                    return (
                                        <div key={day.key} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${config.active ? 'bg-white border-slate-200' : 'bg-slate-50 border-transparent opacity-60'}`}>
                                            <div className="flex items-center gap-4"><ToggleSwitch on={config.active} onClick={() => updateSchedule(day.key, 'active', !config.active)} /><span className="font-bold text-slate-700 w-32">{day.label}</span></div>
                                            {config.active && (
                                                <div className="flex items-center gap-2"><input type="time" value={config.start} onChange={e => updateSchedule(day.key, 'start', e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold" /><span>até</span><input type="time" value={config.end} onChange={e => updateSchedule(day.key, 'end', e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold" /></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}
                    {activeTab === 'comissoes' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <Card title="Comissionamento (%)">
                                <div className="p-8 bg-orange-50 rounded-3xl border border-orange-100 flex items-center justify-center gap-4">
                                    <input type="number" value={prof.commission_rate} onChange={e => setProf({...prof, commission_rate: e.target.value})} className="w-32 border-2 border-orange-300 rounded-2xl px-4 py-4 text-4xl font-black text-orange-600 text-center" /><span className="text-2xl font-black text-orange-300">%</span>
                                </div>
                            </Card>
                            <div className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-3xl"><p className="font-bold text-slate-700">Agenda Online Ativa?</p><ToggleSwitch on={!!prof.online_booking} onClick={() => setProf({...prof, online_booking: !prof.online_booking})} /></div>
                        </div>
                    )}
                    {activeTab === 'permissoes' && (
                        <Card title="Controle de Acesso">
                            <div className="space-y-4">
                                {[{ key: 'view_calendar', label: 'Ver agenda geral' }, { key: 'edit_calendar', label: 'Gerenciar própria agenda' }, { key: 'view_finance', label: 'Lançar vendas' }].map(item => (
                                    <div key={item.key} className="flex items-center justify-between p-5 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100"><p className="font-bold text-slate-700 text-sm">{item.label}</p><ToggleSwitch on={!!prof.permissions[item.key]} onClick={() => setProf({...prof, permissions: {...prof.permissions, [item.key]: !prof.permissions[item.key]}})} /></div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ProfessionalDetail;
