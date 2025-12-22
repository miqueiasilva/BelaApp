
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Globe, Copy, ExternalLink, Save, Loader2, 
    Smartphone, Palette, Info, RefreshCw, Check
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import Card from '../shared/Card';
import ToggleSwitch from '../shared/ToggleSwitch';
import Toast, { ToastType } from '../shared/Toast';

const AgendaOnlineView: React.FC = () => {
    // --- Estados de Controle ---
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // --- Estados dos Dados (Sincronizados com DB) ---
    const [settings, setSettings] = useState({
        id: null as number | null,
        studio_name: '',
        general_notice: '',
        online_booking_enabled: false,
        logo_url: ''
    });

    const abortControllerRef = useRef<AbortController | null>(null);

    // --- Helpers ---
    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        setToast({ message, type });
    }, []);

    const publicLink = `${window.location.origin}/#/agendar`;

    // --- Busca de Dados Robusta ---
    const fetchSettings = useCallback(async (showFeedback = false) => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        if (!showFeedback) setIsLoading(true);
        
        try {
            // 1. Tentar buscar registro existente
            const { data, error } = await supabase
                .from('studio_settings')
                .select('*')
                .maybeSingle()
                .abortSignal(controller.signal);

            if (error) throw error;

            if (data) {
                // Registro encontrado
                setSettings({
                    id: data.id,
                    studio_name: data.studio_name || '',
                    general_notice: data.general_notice || '',
                    online_booking_enabled: !!data.online_booking_enabled,
                    logo_url: data.logo_url || ''
                });
            } else {
                // 2. Se não existir, criar linha padrão para evitar erros futuros
                const { data: newData, error: insertError } = await supabase
                    .from('studio_settings')
                    .insert([{ 
                        studio_name: 'Meu Estúdio de Beleza', 
                        online_booking_enabled: false,
                        general_notice: 'Seja bem-vindo(a)!' 
                    }])
                    .select()
                    .single();
                
                if (insertError) throw insertError;
                if (newData) {
                    setSettings({
                        id: newData.id,
                        studio_name: newData.studio_name,
                        general_notice: newData.general_notice,
                        online_booking_enabled: !!newData.online_booking_enabled,
                        logo_url: newData.logo_url || ''
                    });
                }
            }
            if (showFeedback) showToast("Configurações sincronizadas!");
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error("Erro ao carregar Agenda Online:", err);
                showToast("Erro ao conectar com o servidor.", "error");
            }
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchSettings();
        return () => abortControllerRef.current?.abort();
    }, [fetchSettings]);

    // --- Salvamento Blindado (Correção do Reset Visual) ---
    const handleSave = async () => {
        if (!settings.id) return;
        
        setIsSaving(true);
        try {
            const payload = {
                studio_name: settings.studio_name,
                general_notice: settings.general_notice,
                online_booking_enabled: settings.online_booking_enabled,
                logo_url: settings.logo_url
            };

            const { error } = await supabase
                .from('studio_settings')
                .update(payload)
                .eq('id', settings.id);

            if (error) throw error;

            // CRÍTICO: Atualizamos o estado local COM O SUCESSO para garantir consistência visual imediata
            setSettings(prev => ({ ...prev, ...payload }));
            
            showToast("Configurações salvas com sucesso!");
            
            // Re-sincroniza silenciosamente para garantir que o BD retornou o que achamos
            fetchSettings(false);
        } catch (err: any) {
            console.error("Erro ao salvar:", err);
            showToast("Falha ao salvar. Tente novamente.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(publicLink);
        showToast("Link copiado!");
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 gap-4">
                <Loader2 className="animate-spin text-orange-500" size={42} />
                <p className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Carregando Módulo...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header Administrativo */}
            <header className="bg-white border-b border-slate-200 px-8 py-5 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 z-20 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Globe size={24} /></div>
                        Página de Agendamento Online
                    </h1>
                    <p className="text-slate-400 text-sm font-medium mt-0.5">Sua vitrine digital para captar clientes 24h por dia.</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                        onClick={() => fetchSettings(true)} 
                        className="p-3 text-slate-400 hover:text-orange-500 bg-white border border-slate-100 rounded-2xl transition-all active:scale-95"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="flex-1 md:flex-none bg-slate-900 hover:bg-black text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:opacity-50 transition-all"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
                        Salvar Alterações
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide">
                <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* CARD 1: STATUS DA AGENDA */}
                    <Card title="Status do Canal de Vendas" icon={<Smartphone size={20} />}>
                        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[28px] border border-slate-100 transition-colors">
                            <div className="space-y-1">
                                <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">Aceitar Agendamentos Online</h4>
                                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                                    {settings.online_booking_enabled 
                                        ? "Seu link está ATIVO e pronto para receber clientes." 
                                        : "Seu link está DESATIVADO. Os clientes não conseguirão agendar."}
                                </p>
                            </div>
                            <ToggleSwitch 
                                on={settings.online_booking_enabled} 
                                onClick={() => setSettings(prev => ({ ...prev, online_booking_enabled: !prev.online_booking_enabled }))} 
                            />
                        </div>
                    </Card>

                    {/* CARD 2: LINK PÚBLICO */}
                    <Card title="Link de Divulgação" icon={<Globe size={20} />}>
                        <div className="space-y-4">
                            <p className="text-xs text-slate-500 ml-1">Copie este link e cole na bio do seu Instagram ou envie no WhatsApp.</p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-inner">
                                    <Globe size={16} className="text-slate-400" />
                                    <input 
                                        readOnly 
                                        value={publicLink}
                                        className="bg-transparent border-none outline-none text-sm font-bold text-slate-600 w-full cursor-default select-all"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleCopyLink}
                                        className="p-4 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 rounded-2xl transition-all shadow-sm active:scale-95 flex items-center gap-2"
                                        title="Copiar Link"
                                    >
                                        <Copy size={20} />
                                        <span className="text-xs font-black uppercase tracking-widest sm:hidden">Copiar</span>
                                    </button>
                                    <a 
                                        href={publicLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-4 bg-white border border-slate-200 text-slate-600 hover:text-orange-500 hover:border-orange-200 rounded-2xl transition-all shadow-sm active:scale-95 flex items-center gap-2"
                                        title="Visualizar Página"
                                    >
                                        <ExternalLink size={20} />
                                        <span className="text-xs font-black uppercase tracking-widest sm:hidden">Ver</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* CARD 3: APARÊNCIA */}
                    <Card title="Identidade Visual & Bio" icon={<Palette size={20} />}>
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Fantasia da Página</label>
                                    <input 
                                        placeholder="Ex: Espaço da Beleza"
                                        value={settings.studio_name}
                                        onChange={e => setSettings({...settings, studio_name: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-700 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Foto de Perfil / Logo</label>
                                     <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                                            {settings.logo_url ? <img src={settings.logo_url} className="w-full h-full object-cover" alt="Logo" /> : <Palette className="text-slate-300" />}
                                        </div>
                                        <button className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-xl transition-all">Alterar Imagem</button>
                                     </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Biografia / Mensagem de Boas-vindas</label>
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{settings.general_notice.length}/200 caracteres</span>
                                </div>
                                <textarea 
                                    maxLength={200}
                                    placeholder="Descreva seu estúdio para os clientes que acessarem o link..."
                                    value={settings.general_notice}
                                    onChange={e => setSettings({...settings, general_notice: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-[28px] px-6 py-5 outline-none focus:ring-2 focus:ring-orange-500/20 font-medium text-slate-600 min-h-[120px] resize-none transition-all leading-relaxed"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Dica JaciBot */}
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-[32px] flex items-start gap-5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all"></div>
                        <div className="p-3.5 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-500/20 relative z-10">
                            <Info size={20} />
                        </div>
                        <div className="relative z-10">
                            <h4 className="font-black text-white text-sm uppercase tracking-widest">Dica Estratégica BelaApp</h4>
                            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                                Ative os <b>Agendamentos Online</b> e coloque o link na sua bio do Instagram. 
                                Clientes que agendam sozinhos reduzem em até <b>60%</b> a carga de atendimento manual da sua recepção.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AgendaOnlineView;
