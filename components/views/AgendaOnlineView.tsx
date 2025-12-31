
import React, { useState, useEffect } from 'react';
import { 
    Globe, Settings, MessageSquare, BarChart2, ExternalLink, 
    Copy, CheckCircle, Share2, Save, Eye, Star, MessageCircle,
    Clock, Calendar, AlertTriangle, ShieldCheck, Loader2, Info
} from 'lucide-react';
import Card from '../shared/Card';
import ToggleSwitch from '../shared/ToggleSwitch';
import { mockReviews, mockAnalytics } from '../../data/mockData';
import { supabase } from '../../services/supabaseClient';
import Toast, { ToastType } from '../shared/Toast';

// Helper for Styled Select
const StyledSelect = ({ label, icon: Icon, value, onChange, options, helperText }: any) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors">
                <Icon size={18} />
            </div>
            <select 
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl appearance-none outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-400 transition-all font-bold text-slate-700 cursor-pointer shadow-sm"
            >
                {options.map((opt: any) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                <ChevronDown size={16} strokeWidth={3} />
            </div>
        </div>
        {helperText && <p className="text-[10px] text-slate-400 font-medium ml-1 leading-tight">{helperText}</p>}
    </div>
);

const ChevronDown = ({ size, strokeWidth }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth || 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6"/>
    </svg>
);

const TabButton = ({ id, label, active, onClick, icon: Icon }: any) => (
    <button
        onClick={() => onClick(id)}
        className={`flex items-center gap-2 px-5 py-4 border-b-2 transition-all font-bold text-sm whitespace-nowrap min-h-[48px] ${
            active 
            ? 'border-orange-500 text-orange-600 bg-orange-50/50' 
            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
        }`}
    >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {label}
    </button>
);

const AgendaOnlineView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'geral' | 'regras' | 'avaliacoes' | 'analytics'>('geral');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // --- State: Configurações unificadas do Supabase ---
    const [config, setConfig] = useState({
        id: null,
        isActive: true,
        slug: '',
        studioName: '',
        description: '',
        // Regras (Novas Colunas)
        min_scheduling_notice: '2',
        max_scheduling_window: '30',
        cancellation_notice: '24',
        cancellation_policy: ''
    });

    const showToast = (message: string, type: ToastType = 'success') => setToast({ message, type });

    // --- Fetch Data ---
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('studio_settings').select('*').maybeSingle();
            if (data) {
                setConfig({
                    id: data.id,
                    isActive: data.online_booking_active ?? true,
                    slug: data.slug || '',
                    studioName: data.studio_name || '',
                    description: data.presentation_text || '',
                    min_scheduling_notice: data.min_scheduling_notice?.toString() || '2',
                    max_scheduling_window: data.max_scheduling_window?.toString() || '30',
                    cancellation_notice: data.cancellation_notice?.toString() || '24',
                    cancellation_policy: data.cancellation_policy || ''
                });
            }
        } catch (e) {
            showToast("Erro ao carregar dados.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                online_booking_active: config.isActive,
                min_scheduling_notice: parseInt(config.min_scheduling_notice),
                max_scheduling_window: parseInt(config.max_scheduling_window),
                cancellation_notice: parseInt(config.cancellation_notice),
                cancellation_policy: config.cancellation_policy,
                studio_name: config.studioName,
                presentation_text: config.description
            };

            const { error } = await supabase
                .from('studio_settings')
                .update(payload)
                .eq('id', config.id);

            if (error) throw error;
            showToast("Regras salvas with sucesso!");
        } catch (e: any) {
            showToast(e.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyLink = () => {
        const baseUrl = window.location.href.split('#')[0];
        navigator.clipboard.writeText(`${baseUrl}#/public-preview`);
        showToast('Link da agenda copiado!', 'info');
    };

    if (isLoading) return <div className="h-full flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-[10px]"><Loader2 className="animate-spin text-orange-500 mr-2" /> Sincronizando Regras...</div>;

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 flex-shrink-0 z-30 shadow-sm">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Globe className="text-blue-500 w-6 h-6" />
                        Agenda Online
                    </h1>
                    <p className="text-slate-500 text-xs font-medium">Link público e limites de reserva.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => window.location.hash = '/public-preview'} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 flex items-center gap-2 text-sm transition-all shadow-sm">
                        <Eye size={18} /> Visualizar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-orange-500 text-white font-black rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-100 flex items-center gap-2 text-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Salvar Alterações
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-white border-b border-slate-200 flex overflow-x-auto scrollbar-hide flex-shrink-0 z-20">
                <div className="flex px-4">
                    <TabButton id="geral" label="Geral" icon={Settings} active={activeTab === 'geral'} onClick={setActiveTab} />
                    <TabButton id="regras" label="Regras" icon={ShieldCheck} active={activeTab === 'regras'} onClick={setActiveTab} />
                    <TabButton id="avaliacoes" label="Avaliações" icon={Star} active={activeTab === 'avaliacoes'} onClick={setActiveTab} />
                    <TabButton id="analytics" label="Desempenho" icon={BarChart2} active={activeTab === 'analytics'} onClick={setActiveTab} />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                <div className="max-w-4xl mx-auto pb-20">
                    
                    {/* TAB: GERAL */}
                    {activeTab === 'geral' && (
                        <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
                            <Card title="Status do Link Público" className="rounded-[32px] border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
                                    <div>
                                        <p className="font-black text-slate-800 text-sm">Disponibilidade Online</p>
                                        <p className="text-xs text-slate-500 mt-1 font-medium">Se desativado, o link exibirá uma mensagem de indisponibilidade.</p>
                                    </div>
                                    <ToggleSwitch on={config.isActive} onClick={() => setConfig({...config, isActive: !config.isActive})} />
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Endereço de Acesso (URL)</label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <div className="flex-1 flex items-center px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 font-bold text-sm overflow-hidden truncate">
                                            {window.location.host}/bela/{config.slug || 'seu-estudio'}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handleCopyLink} className="p-4 bg-white border border-slate-300 rounded-2xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm" title="Copiar Link"><Copy size={20}/></button>
                                            <button className="p-4 bg-green-500 text-white rounded-2xl hover:bg-green-600 transition-all shadow-lg shadow-green-100" title="Compartilhar"><Share2 size={20}/></button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* TAB: REGRAS (NOVA) */}
                    {activeTab === 'regras' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card title="Limites de Agendamento" icon={<Clock size={20} className="text-orange-500" />} className="rounded-[32px] border-slate-200 shadow-sm">
                                    <div className="space-y-6 mt-2">
                                        <StyledSelect 
                                            label="Antecedência Mínima"
                                            icon={Clock}
                                            value={config.min_scheduling_notice}
                                            onChange={(val: string) => setConfig({...config, min_scheduling_notice: val})}
                                            helperText="Tempo necessário para você se organizar antes do cliente chegar."
                                            options={[
                                                { value: '1', label: '1 hora antes' },
                                                { value: '2', label: '2 horas antes (Recomendado)' },
                                                { value: '4', label: '4 horas antes' },
                                                { value: '12', label: '12 horas antes' },
                                                { value: '24', label: '24 horas (1 dia)' },
                                                { value: '48', label: '48 horas (2 dias)' },
                                            ]}
                                        />

                                        <StyledSelect 
                                            label="Horizonte da Agenda"
                                            icon={Calendar}
                                            value={config.max_scheduling_window}
                                            onChange={(val: string) => setConfig({...config, max_scheduling_window: val})}
                                            helperText="Até quando no futuro o cliente pode ver seus horários livres."
                                            options={[
                                                { value: '7', label: 'Próximos 7 dias' },
                                                { value: '15', label: 'Próximos 15 dias' },
                                                { value: '30', label: 'Próximos 30 dias (Padrão)' },
                                                { value: '60', label: 'Próximos 60 dias' },
                                                { value: '90', label: 'Próximos 90 dias' },
                                            ]}
                                        />
                                    </div>
                                </Card>

                                <Card title="Blindagem de Horário" icon={<AlertTriangle size={20} className="text-orange-500" />} className="rounded-[32px] border-slate-200 shadow-sm">
                                    <div className="space-y-6 mt-2">
                                        <StyledSelect 
                                            label="Aviso de Cancelamento"
                                            icon={Info}
                                            value={config.cancellation_notice}
                                            onChange={(val: string) => setConfig({...config, cancellation_notice: val})}
                                            helperText="Evita que o cliente cancele muito em cima da hora sem aviso."
                                            options={[
                                                { value: '0', label: 'A qualquer momento' },
                                                { value: '2', label: '2 horas antes' },
                                                { value: '12', label: '12 horas antes' },
                                                { value: '24', label: '24 horas antes' },
                                                { value: '48', label: '48 horas antes' },
                                            ]}
                                        />

                                        <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3">
                                            <div className="p-2 bg-white rounded-xl shadow-sm text-orange-600 h-fit"><ShieldCheck size={20}/></div>
                                            <p className="text-[11px] text-orange-800 leading-relaxed font-bold">
                                                Dica: Exigir 24h de antecedência para cancelamento ajuda a manter sua taxa de ocupação saudável.
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            <Card title="Texto da Política de Cancelamento" icon={<MessageCircle size={20} className="text-orange-500" />} className="rounded-[32px] border-slate-200 shadow-sm">
                                <div className="space-y-4">
                                    <p className="text-xs text-slate-500 font-medium ml-1">Esta mensagem será exibida para o cliente no momento da reserva e no link de cancelamento.</p>
                                    <textarea 
                                        value={config.cancellation_policy}
                                        onChange={(e) => setConfig({...config, cancellation_policy: e.target.value})}
                                        placeholder="Ex: Cancelamentos com menos de 24h de antecedência estão sujeitos a multa de 50% do valor do serviço no próximo agendamento..."
                                        className="w-full h-40 p-5 bg-slate-50 border border-slate-200 rounded-[24px] outline-none focus:ring-4 focus:ring-orange-50 focus:border-orange-400 font-medium text-slate-600 resize-none transition-all placeholder:text-slate-300"
                                    />
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        <CheckCircle size={12} className="text-green-500" />
                                        Sincronizado com os termos de uso do estúdio
                                    </div>
                                </div>
                            </Card>

                        </div>
                    )}

                    {activeTab === 'avaliacoes' && (
                        <div className="max-w-2xl mx-auto py-20 text-center space-y-4 animate-in fade-in">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                <Star size={40} />
                            </div>
                            <h3 className="font-black text-slate-700 text-lg">Módulo de Reputação</h3>
                            <p className="text-slate-400 text-sm">Visualize o que seus clientes estão falando sobre seus serviços.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AgendaOnlineView;
