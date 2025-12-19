
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    ChevronLeft, Mail, Phone, Calendar, Clock, DollarSign, 
    CheckCircle, User, Save, Trash2, Globe, Camera, Scissors, 
    Loader2, Shield, Bell, Search, AlertCircle, Coffee
} from 'lucide-react';
import { LegacyProfessional, LegacyService } from '../../types';
import Card from '../shared/Card';
import ToggleSwitch from '../shared/ToggleSwitch';
import { supabase } from '../../services/supabaseClient';

// --- Constantes de Configuração ---

const PERMISSION_GROUPS = {
    agenda: { 
        title: "Agenda & Atendimentos", 
        icon: <Calendar size={18} />,
        permissions: [
            { key: 'view_calendar', label: 'Visualizar agenda de terceiros' },
            { key: 'edit_calendar', label: 'Agendar e alterar atendimentos' },
            { key: 'block_time', label: 'Bloquear horários' },
            { key: 'view_client_notes', label: 'Ver notas privadas de clientes' }
        ]
    },
    financeiro: { 
        title: "Financeiro & Vendas", 
        icon: <DollarSign size={18} />,
        permissions: [
            { key: 'view_sales', label: 'Ver extrato de vendas' },
            { key: 'perform_checkout', label: 'Finalizar comandas/pagamentos' },
            { key: 'give_discount', label: 'Aplicar descontos em vendas' },
            { key: 'view_commissions', label: 'Ver próprio relatório de comissão' }
        ]
    },
    clientes: { 
        title: "Base de Clientes", 
        icon: <User size={18} />,
        permissions: [
            { key: 'view_clients', label: 'Visualizar lista de clientes' },
            { key: 'add_clients', label: 'Cadastrar novos clientes' },
            { key: 'delete_clients', label: 'Remover clientes do sistema' }
        ]
    }
};

const DAYS_OF_WEEK = [
    { key: 'monday', label: 'Segunda-feira' },
    { key: 'tuesday', label: 'Terça-feira' },
    { key: 'wednesday', label: 'Quarta-feira' },
    { key: 'thursday', label: 'Quinta-feira' },
    { key: 'friday', label: 'Sexta-feira' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
];

interface ProfessionalDetailProps {
    professional: LegacyProfessional;
    onBack: () => void;
    onSave: (prof: LegacyProfessional) => void;
}

const ProfessionalDetail: React.FC<ProfessionalDetailProps> = ({ professional: initialProf, onBack, onSave }) => {
    // --- States ---
    const [prof, setProf] = useState<any>(initialProf);
    const [allServices, setAllServices] = useState<LegacyService[]>([]);
    const [serviceSearch, setServiceSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'perfil' | 'servicos' | 'horarios' | 'comissoes' | 'permissoes' | 'avisos'>('perfil');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Data Initialization ---
    useEffect(() => {
        const loadServices = async () => {
            const { data } = await supabase.from('services').select('*').order('name');
            if (data) setAllServices(data as any);
        };

        // Normalização de dados JSONB vindo do banco
        const normalized = {
            ...initialProf,
            permissions: (initialProf as any).permissions || {},
            services_enabled: (initialProf as any).services_enabled || [],
            commission_config: (initialProf as any).commission_config || { deduct_fees: false, receive_tips: true, calc_rule: 'liquido' },
            work_schedule: (initialProf as any).work_schedule || {},
            notification_settings: (initialProf as any).notification_settings || { email_booking: true, email_cancel: true, whatsapp_notify: false }
        };
        
        setProf(normalized);
        loadServices();
    }, [initialProf]);

    // --- Helpers ---
    const filteredServices = useMemo(() => {
        return allServices.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()));
    }, [allServices, serviceSearch]);

    // --- Handlers ---
    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                name: prof.name,
                role: prof.role,
                phone: prof.phone,
                email: prof.email,
                active: prof.active,
                online_booking: prof.onlineBooking,
                pix_key: prof.pixKey,
                commission_rate: prof.commissionRate,
                // Colunas JSONB
                permissions: prof.permissions,
                services_enabled: prof.services_enabled,
                commission_config: prof.commission_config,
                work_schedule: prof.work_schedule,
                notification_settings: prof.notification_settings,
                photo_url: prof.avatarUrl
            };

            const { error } = await supabase
                .from('professionals')
                .update(payload)
                .eq('id', prof.id);

            if (error) throw error;

            alert("Configurações atualizadas com sucesso! ✅");
            onSave(prof);
            onBack();
        } catch (error: any) {
            alert(`Erro ao salvar: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const fileName = `${prof.id}-${Date.now()}`;
            const { error: uploadError } = await supabase.storage.from('team-photos').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('team-photos').getPublicUrl(fileName);
            setProf({ ...prof, avatarUrl: publicUrl });
        } catch (e) { alert("Erro no upload"); } finally { setIsUploading(false); }
    };

    const updateNested = (category: string, key: string, value: any) => {
        setProf((prev: any) => ({
            ...prev,
            [category]: { ...prev[category], [key]: value }
        }));
    };

    const toggleService = (id: number) => {
        const current = prof.services_enabled || [];
        const next = current.includes(id) ? current.filter((sId: number) => sId !== id) : [...current, id];
        setProf({ ...prof, services_enabled: next });
    };

    // --- Sub-Components (Views) ---

    const Tabs = () => (
        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-6 overflow-x-auto scrollbar-hide">
            {[
                { id: 'perfil', label: 'Perfil', icon: User },
                { id: 'servicos', label: 'Serviços', icon: Scissors },
                { id: 'horarios', label: 'Horários', icon: Clock },
                { id: 'comissoes', label: 'Comissões', icon: DollarSign },
                { id: 'permissoes', label: 'Permissões', icon: Shield },
                { id: 'avisos', label: 'Notificações', icon: Bell }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                        activeTab === tab.id ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'
                    }`}
                >
                    <tab.icon size={16} /> {tab.label}
                </button>
            ))}
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
            {/* Header Fixo */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ChevronLeft size={24} /></button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{prof.name || 'Novo Colaborador'}</h2>
                        <p className="text-xs text-slate-500 font-medium">Configurações gerais de atuação</p>
                    </div>
                </div>
                <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-orange-100 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Salvar Alterações
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl mx-auto">
                    <Tabs />

                    {/* ABA PERFIL */}
                    {activeTab === 'perfil' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2">
                            <Card className="lg:col-span-1 flex flex-col items-center justify-center p-8 text-center">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-32 h-32 rounded-full border-4 border-slate-50 shadow-inner overflow-hidden bg-slate-100">
                                        {prof.avatarUrl ? (
                                            <img src={prof.avatarUrl} className="w-full h-full object-cover" alt="" />
                                        ) : <User size={48} className="m-10 text-slate-300" />}
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="text-white" />
                                    </div>
                                    {isUploading && <div className="absolute inset-0 bg-white/60 rounded-full flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>}
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUploadFoto} />
                                <h3 className="mt-4 font-bold text-slate-800">{prof.name}</h3>
                                <p className="text-xs text-slate-400 uppercase font-bold mt-1 tracking-widest">{prof.role || 'Sem Cargo'}</p>
                            </Card>

                            <div className="lg:col-span-2 space-y-6">
                                <Card title="Informações de Contato">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome Completo</label>
                                            <input value={prof.name} onChange={e => setProf({...prof, name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cargo/Função</label>
                                            <input value={prof.role} onChange={e => setProf({...prof, role: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">WhatsApp</label>
                                            <input value={prof.phone} onChange={e => setProf({...prof, phone: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">E-mail</label>
                                            <input value={prof.email} onChange={e => setProf({...prof, email: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none" />
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* ABA SERVICOS */}
                    {activeTab === 'servicos' && (
                        <div className="space-y-6 animate-in fade-in">
                            <Card>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <h3 className="font-bold text-slate-800">Serviços Habilitados</h3>
                                        <p className="text-sm text-slate-500">Marque os serviços que este profissional pode realizar.</p>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input 
                                            placeholder="Buscar serviço..."
                                            value={serviceSearch}
                                            onChange={e => setServiceSearch(e.target.value)}
                                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm w-full md:w-64"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                                    {filteredServices.map(service => {
                                        const isEnabled = prof.services_enabled?.includes(service.id);
                                        return (
                                            <div 
                                                key={service.id} 
                                                onClick={() => toggleService(service.id)}
                                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${
                                                    isEnabled ? 'border-orange-500 bg-orange-50/30' : 'border-slate-100 hover:border-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEnabled ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                        <Scissors size={20} />
                                                    </div>
                                                    <div className="truncate">
                                                        <p className="font-bold text-sm text-slate-800 truncate">{service.name}</p>
                                                        <p className="text-xs text-slate-500">R$ {service.price.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isEnabled ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>
                                                    {isEnabled && <CheckCircle size={14} className="text-white" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* ABA COMISSÕES */}
                    {activeTab === 'comissoes' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <Card title="Regras de Comissionamento">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="p-5 bg-orange-50 rounded-3xl border border-orange-100">
                                            <label className="block text-xs font-bold text-orange-800 uppercase mb-2">Comissão Padrão (%)</label>
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="number" 
                                                    value={prof.commissionRate}
                                                    onChange={e => setProf({...prof, commissionRate: Number(e.target.value)})}
                                                    className="w-24 border-2 border-orange-200 rounded-xl px-3 py-3 text-2xl font-black text-orange-600 outline-none focus:border-orange-500"
                                                />
                                                <span className="text-sm font-bold text-orange-800">Por serviço realizado</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">Descontar taxa de cartão?</p>
                                                    <p className="text-xs text-slate-500">Subtrai a taxa da operadora antes da comissão.</p>
                                                </div>
                                                <ToggleSwitch on={prof.commission_config?.deduct_fees} onClick={() => updateNested('commission_config', 'deduct_fees', !prof.commission_config.deduct_fees)} />
                                            </div>
                                            <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">Receber gorjetas?</p>
                                                    <p className="text-xs text-slate-500">Repassa 100% das gorjetas lançadas.</p>
                                                </div>
                                                <ToggleSwitch on={prof.commission_config?.receive_tips} onClick={() => updateNested('commission_config', 'receive_tips', !prof.commission_config.receive_tips)} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                                        <h4 className="font-bold text-slate-700 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
                                            <AlertCircle size={16} className="text-orange-500" /> Regra de Cálculo
                                        </h4>
                                        <div className="space-y-3">
                                            {['bruto', 'liquido'].map(rule => (
                                                <button
                                                    key={rule}
                                                    onClick={() => updateNested('commission_config', 'calc_rule', rule)}
                                                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                                                        prof.commission_config?.calc_rule === rule ? 'border-orange-500 bg-white shadow-md' : 'border-slate-200 bg-transparent text-slate-500 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <p className="font-bold capitalize">{rule}</p>
                                                    <p className="text-xs opacity-70">
                                                        {rule === 'bruto' ? 'Calculado sobre o valor total cobrado do cliente.' : 'Calculado após descontar custos de produtos/taxas.'}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* ABA PERMISSOES */}
                    {activeTab === 'permissoes' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in zoom-in-95">
                            {Object.entries(PERMISSION_GROUPS).map(([key, group]) => (
                                <Card key={key} className="relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 text-slate-50 group-hover:text-slate-100 transition-colors pointer-events-none">
                                        {React.cloneElement(group.icon as any, { size: 120 })}
                                    </div>
                                    <div className="relative z-10">
                                        <h3 className="font-black text-slate-800 flex items-center gap-2 mb-4 uppercase tracking-tighter">
                                            {group.icon} {group.title}
                                        </h3>
                                        <div className="space-y-2">
                                            {group.permissions.map(p => (
                                                <div key={p.key} className="flex items-center justify-between p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-100 hover:border-orange-200 transition-all">
                                                    <span className="text-sm font-medium text-slate-700">{p.label}</span>
                                                    <ToggleSwitch 
                                                        on={prof.permissions?.[p.key] || false} 
                                                        onClick={() => updateNested('permissions', p.key, !prof.permissions?.[p.key])} 
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* ABA HORARIOS */}
                    {activeTab === 'horarios' && (
                        <Card title="Grade de Atendimento" icon={<Clock size={20} />} className="animate-in fade-in">
                            <div className="space-y-4">
                                {DAYS_OF_WEEK.map(day => {
                                    const config = prof.work_schedule?.[day.key] || { active: true, start: '09:00', end: '18:00', lunch_start: '12:00', lunch_end: '13:00' };
                                    return (
                                        <div key={day.key} className={`p-4 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${config.active ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-transparent opacity-50 grayscale'}`}>
                                            <div className="flex items-center gap-4 min-w-[200px]">
                                                <ToggleSwitch 
                                                    on={config.active} 
                                                    onClick={() => updateNested('work_schedule', day.key, { ...config, active: !config.active })} 
                                                />
                                                <span className="font-black text-slate-800 uppercase tracking-tighter text-sm">{day.label}</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Expediente</span>
                                                    <input type="time" value={config.start} onChange={e => updateNested('work_schedule', day.key, {...config, start: e.target.value})} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:border-orange-500 outline-none" />
                                                    <span className="text-slate-300">/</span>
                                                    <input type="time" value={config.end} onChange={e => updateNested('work_schedule', day.key, {...config, end: e.target.value})} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:border-orange-500 outline-none" />
                                                </div>
                                                <div className="hidden lg:flex items-center gap-2 border-l pl-6 border-slate-100">
                                                    <Coffee size={14} className="text-slate-300" />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Almoço</span>
                                                    <input type="time" value={config.lunch_start} onChange={e => updateNested('work_schedule', day.key, {...config, lunch_start: e.target.value})} className="px-3 py-1.5 border border-slate-100 rounded-lg text-xs text-slate-500 focus:border-orange-500 outline-none" />
                                                    <span className="text-slate-300">-</span>
                                                    <input type="time" value={config.lunch_end} onChange={e => updateNested('work_schedule', day.key, {...config, lunch_end: e.target.value})} className="px-3 py-1.5 border border-slate-100 rounded-lg text-xs text-slate-500 focus:border-orange-500 outline-none" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* ABA NOTIFICACOES */}
                    {activeTab === 'avisos' && (
                        <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-top-4">
                            <Card title="Alertas do Sistema" icon={<Bell size={20} />}>
                                <div className="space-y-2">
                                    {[
                                        { key: 'email_booking', label: 'E-mail em novos agendamentos', sub: 'Receba detalhes completos da reserva.' },
                                        { key: 'email_cancel', label: 'E-mail em cancelamentos', sub: 'Mantenha sua agenda sempre atualizada.' },
                                        { key: 'whatsapp_notify', label: 'WhatsApp de agendamento (Experimental)', sub: 'Notificações diretas no seu aparelho pessoal.' }
                                    ].map(item => (
                                        <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-transparent hover:border-orange-100 transition-all">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{item.label}</p>
                                                <p className="text-xs text-slate-500">{item.sub}</p>
                                            </div>
                                            <ToggleSwitch 
                                                on={prof.notification_settings?.[item.key] || false} 
                                                onClick={() => updateNested('notification_settings', item.key, !prof.notification_settings?.[item.key])} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ProfessionalDetail;
