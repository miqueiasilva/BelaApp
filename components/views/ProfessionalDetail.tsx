
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    ChevronLeft, User, Save, Trash2, Camera, Scissors, 
    Loader2, Shield, Bell, Clock, DollarSign, CheckCircle, Info
} from 'lucide-react';
import { LegacyProfessional, LegacyService } from '../../types';
import Card from '../shared/Card';
import ToggleSwitch from '../shared/ToggleSwitch';
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
    const [prof, setProf] = useState<any>(initialProf);
    const [allServices, setAllServices] = useState<LegacyService[]>([]);
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'perfil' | 'servicos' | 'horarios' | 'comissoes' | 'permissoes'>('perfil');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const init = async () => {
            const { data: svcs } = await supabase.from('services').select('*').order('name');
            if (svcs) setAllServices(svcs as any);

            const normalized = {
                ...initialProf,
                cpf: (initialProf as any).cpf || '',
                bio: (initialProf as any).bio || '',
                commission_rate: (initialProf as any).commission_rate ?? 0,
                permissions: (initialProf as any).permissions || { view_calendar: true, edit_calendar: false },
                services_enabled: (initialProf as any).services_enabled || [],
                work_schedule: (initialProf as any).work_schedule || {},
                photo_url: (initialProf as any).photo_url || initialProf.avatarUrl || null
            };
            setProf(normalized);
        };
        init();
    }, [initialProf]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${prof.id}-${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setProf({ ...prof, photo_url: publicUrl });
            alert("Foto carregada com sucesso! Lembre-se de salvar as alterações.");
        } catch (error: any) {
            alert(`Erro no upload: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload = {
                name: prof.name,
                role: prof.role,
                phone: prof.phone,
                email: prof.email,
                active: prof.active,
                commission_rate: parseFloat(prof.commission_rate) || 0,
                cpf: prof.cpf,
                bio: prof.bio,
                permissions: prof.permissions,
                services_enabled: prof.services_enabled,
                work_schedule: prof.work_schedule,
                photo_url: prof.photo_url
            };

            const { error } = await supabase
                .from('professionals')
                .update(payload)
                .eq('id', prof.id);

            if (error) throw error;
            alert("Dados atualizados! ✅");
            onSave();
        } catch (error: any) {
            alert(`Erro ao salvar: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Deseja realmente remover este profissional permanentemente?")) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('professionals').delete().eq('id', prof.id);
            if (error) throw error;
            onBack();
        } catch (error: any) {
            alert("Erro ao excluir.");
        } finally {
            setLoading(false);
        }
    };

    const toggleService = (id: number) => {
        const current = prof.services_enabled || [];
        const next = current.includes(id) ? current.filter((sId: number) => sId !== id) : [...current, id];
        setProf({ ...prof, services_enabled: next });
    };

    const updateSchedule = (day: string, field: string, value: any) => {
        const current = prof.work_schedule[day] || { active: false, start: '09:00', end: '18:00' };
        setProf({
            ...prof,
            work_schedule: {
                ...prof.work_schedule,
                [day]: { ...current, [field]: value }
            }
        });
    };

    const updatePermission = (key: string, value: boolean) => {
        setProf({
            ...prof,
            permissions: { ...prof.permissions, [key]: value }
        });
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{prof.name}</h2>
                        <p className="text-xs text-slate-500 font-medium">Edição de perfil profissional</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleDelete} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                        <Trash2 size={20} />
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-orange-100 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        Salvar Dados
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl mx-auto">
                    {/* Tabs */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-8 overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'perfil', label: 'Perfil', icon: User },
                            { id: 'servicos', label: 'Serviços', icon: Scissors },
                            { id: 'horarios', label: 'Horários', icon: Clock },
                            { id: 'comissoes', label: 'Comissão', icon: DollarSign },
                            { id: 'permissoes', label: 'Permissões', icon: Shield }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                                    activeTab === tab.id ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'
                                }`}
                            >
                                <tab.icon size={16} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* PERFIL TAB */}
                    {activeTab === 'perfil' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
                            <Card className="lg:col-span-1 h-fit">
                                <div className="flex flex-col items-center py-6">
                                    <div 
                                        className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-200 mb-6 relative group cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {prof.photo_url ? (
                                            <img src={prof.photo_url} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <User size={48} className="m-10 text-slate-400" />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            {isUploading ? <Loader2 className="animate-spin text-white" /> : <Camera className="text-white" />}
                                        </div>
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />
                                    <p className="text-xs text-slate-400 font-medium">Clique para trocar foto</p>
                                </div>
                            </Card>
                            <div className="lg:col-span-2 space-y-6">
                                <Card title="Informações Pessoais">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                            <input value={prof.name} onChange={e => setProf({...prof, name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo / Especialidade</label>
                                            <input value={prof.role} onChange={e => setProf({...prof, role: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF</label>
                                            <input value={prof.cpf} onChange={e => setProf({...prof, cpf: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="000.000.000-00" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                                            <input value={prof.phone} onChange={e => setProf({...prof, phone: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="(00) 00000-0000" />
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Biografia</label>
                                        <textarea value={prof.bio} onChange={e => setProf({...prof, bio: e.target.value})} className="w-full h-24 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none resize-none" placeholder="Conte um pouco sobre o profissional..." />
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* SERVICOS TAB */}
                    {activeTab === 'servicos' && (
                        <Card title="Serviços Habilitados" className="animate-in fade-in duration-300">
                            <p className="text-sm text-slate-500 mb-6">Marque os procedimentos que este profissional está apto a realizar.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {allServices.map(service => {
                                    const isEnabled = prof.services_enabled?.includes(service.id);
                                    return (
                                        <button
                                            key={service.id}
                                            onClick={() => toggleService(service.id)}
                                            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                                                isEnabled ? 'border-orange-500 bg-orange-50' : 'border-slate-100 hover:border-slate-200 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: service.color }}></div>
                                                <div className="overflow-hidden">
                                                    <p className={`font-bold text-sm truncate ${isEnabled ? 'text-orange-900' : 'text-slate-700'}`}>{service.name}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">{service.duration} min</p>
                                                </div>
                                            </div>
                                            {isEnabled && <CheckCircle size={18} className="text-orange-500 flex-shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* HORARIOS TAB */}
                    {activeTab === 'horarios' && (
                        <Card title="Grade de Horários" className="animate-in fade-in duration-300">
                            <div className="space-y-3">
                                {DAYS_OF_WEEK.map(day => {
                                    const config = prof.work_schedule[day.key] || { active: false, start: '09:00', end: '18:00' };
                                    return (
                                        <div key={day.key} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${config.active ? 'bg-white border-slate-200' : 'bg-slate-50 border-transparent opacity-60'}`}>
                                            <div className="flex items-center gap-4">
                                                <ToggleSwitch on={config.active} onClick={() => updateSchedule(day.key, 'active', !config.active)} />
                                                <span className="font-bold text-slate-700 w-32">{day.label}</span>
                                            </div>
                                            {config.active && (
                                                <div className="flex items-center gap-3">
                                                    <input type="time" value={config.start} onChange={e => updateSchedule(day.key, 'start', e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold focus:ring-1 focus:ring-orange-500 outline-none" />
                                                    <span className="text-slate-300 font-bold">até</span>
                                                    <input type="time" value={config.end} onChange={e => updateSchedule(day.key, 'end', e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold focus:ring-1 focus:ring-orange-500 outline-none" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* COMISSOES TAB */}
                    {activeTab === 'comissoes' && (
                        <Card title="Configuração de Ganhos" className="animate-in fade-in duration-300 max-w-2xl mx-auto">
                            <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 mb-6">
                                <label className="block text-xs font-black text-orange-800 uppercase mb-4">Comissão sobre Serviços (%)</label>
                                <div className="flex items-center gap-6">
                                    <input 
                                        type="number" 
                                        value={prof.commission_rate}
                                        onChange={e => setProf({...prof, commission_rate: e.target.value})}
                                        className="w-32 border-2 border-orange-200 rounded-2xl px-4 py-4 text-4xl font-black text-orange-600 outline-none focus:border-orange-500 bg-white"
                                    />
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-orange-800">Repasse Direto</p>
                                        <p className="text-xs text-orange-600 font-medium">Este percentual será calculado automaticamente no faturamento do colaborador.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">Habilitar Agenda Online?</p>
                                        <p className="text-xs text-slate-500">Permite que clientes escolham este profissional pelo link público.</p>
                                    </div>
                                    <ToggleSwitch on={!!prof.online_booking} onClick={() => setProf({...prof, online_booking: !prof.online_booking})} />
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* PERMISSOES TAB */}
                    {activeTab === 'permissoes' && (
                        <Card title="Permissões de Sistema" className="animate-in fade-in duration-300 max-w-2xl mx-auto">
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3 mb-4">
                                    <Shield size={20} className="text-blue-500 flex-shrink-0" />
                                    <p className="text-xs text-blue-700 leading-relaxed">As permissões abaixo definem o que este colaborador pode ver e fazer no BelaApp. Tenha cautela ao habilitar acesso a dados financeiros.</p>
                                </div>
                                {[
                                    { key: 'view_calendar', label: 'Pode ver agenda da equipe', sub: 'Visualiza horários de outros profissionais.' },
                                    { key: 'edit_calendar', label: 'Pode editar agenda própria', sub: 'Mover, cancelar ou agendar serviços.' },
                                    { key: 'view_finance', label: 'Acesso ao financeiro (PDV)', sub: 'Pode fechar vendas e lançar pagamentos.' },
                                    { key: 'edit_stock', label: 'Gerenciar estoque', sub: 'Lançar entradas e saídas de produtos.' }
                                ].map(item => (
                                    <div key={item.key} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{item.label}</p>
                                            <p className="text-xs text-slate-500">{item.sub}</p>
                                        </div>
                                        <ToggleSwitch 
                                            on={!!prof.permissions?.[item.key]} 
                                            onClick={() => updatePermission(item.key, !prof.permissions?.[item.key])} 
                                        />
                                    </div>
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
