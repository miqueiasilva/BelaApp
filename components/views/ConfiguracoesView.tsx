
import React, { useState, useMemo, useEffect } from 'react';
import { 
    Settings, User, Scissors, Clock, Bell, Store, Save, Plus, 
    Trash2, Edit2, Search, Filter, ChevronLeft, Menu, ChevronRight, 
    Camera, Loader2, MapPin, Phone, Mail, FileText, Coffee, CheckCircle,
    CreditCard, DollarSign, Wallet, Smartphone
} from 'lucide-react';
import Card from '../shared/Card';
import ToggleSwitch from '../shared/ToggleSwitch';
import Toast, { ToastType } from '../shared/Toast';
import { ServiceModal, ProfessionalModal } from '../modals/ConfigModals';
import { LegacyService, LegacyProfessional } from '../../types';
import ProfessionalDetail from './ProfessionalDetail';
import { supabase } from '../../services/supabaseClient';

const DAYS_OF_WEEK = [
    { key: 'monday', label: 'Segunda-feira' },
    { key: 'tuesday', label: 'Terça-feira' },
    { key: 'wednesday', label: 'Quarta-feira' },
    { key: 'thursday', label: 'Quinta-feira' },
    { key: 'friday', label: 'Sexta-feira' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
];

const ConfiguracoesView: React.FC = () => {
    const [activeTab, setActiveTab] = useState('studio');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const showToast = (message: string, type: ToastType = 'success') => {
        setToast({ message, type });
    };

    const [studioSettings, setStudioSettings] = useState<any>({
        id: null, studio_name: '', address: '', phone: '', general_notice: '', work_schedule: {}
    });

    const [servicesData, setServicesData] = useState<LegacyService[]>([]);
    const [colaboradores, setColaboradores] = useState<LegacyProfessional[]>([]);
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(null);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

    const [serviceModal, setServiceModal] = useState<{ open: boolean; data: LegacyService | null }>({ open: false, data: null });
    const [profModal, setProfModal] = useState<{ open: boolean; data: LegacyProfessional | null }>({ open: false, data: null });

    const fetchPaymentMethods = async () => {
        const { data, error } = await supabase.from('payment_methods').select('*').order('id');
        if (data) setPaymentMethods(data);
    };

    useEffect(() => {
        const loadAll = async () => {
            setIsLoading(true);
            const { data: studio } = await supabase.from('studio_settings').select('*').limit(1).maybeSingle();
            if (studio) setStudioSettings(studio);

            const { data: services } = await supabase.from('services').select('*').order('name');
            if (services) setServicesData(services);

            const { data: profs } = await supabase.from('professionals').select('*').order('name');
            if (profs) setColaboradores(profs);

            await fetchPaymentMethods();
            setIsLoading(false);
        };
        loadAll();
    }, []);

    const handleSaveFinance = async () => {
        setIsSaving(true);
        try {
            const promises = paymentMethods.map(pm => 
                supabase.from('payment_methods').update({ fee_percentage: pm.fee_percentage }).eq('id', pm.id)
            );
            await Promise.all(promises);
            showToast("Taxas bancárias atualizadas!");
        } catch (e) {
            showToast("Erro ao salvar taxas", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const renderFinanceTab = () => (
        <div className="space-y-6 animate-in fade-in">
            <Card title="Taxas e Formas de Pagamento" icon={<DollarSign size={18}/>}>
                <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                    <CreditCard className="text-blue-500 flex-shrink-0" size={20} />
                    <p className="text-sm text-blue-700 leading-relaxed">
                        Defina as taxas cobradas pela sua maquininha de cartão. Essas taxas serão descontadas das comissões se a opção estiver ativa no perfil do colaborador.
                    </p>
                </div>

                <div className="space-y-4">
                    {paymentMethods.map((pm, idx) => (
                        <div key={pm.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 transition-all shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                    {pm.name.toLowerCase().includes('cartao') || pm.name.toLowerCase().includes('credito') ? <CreditCard size={18}/> : <DollarSign size={18}/>}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{pm.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Taxa Administrativa</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <input 
                                        type="number"
                                        step="0.01"
                                        value={pm.fee_percentage}
                                        onChange={e => {
                                            const newMethods = [...paymentMethods];
                                            newMethods[idx].fee_percentage = parseFloat(e.target.value) || 0;
                                            setPaymentMethods(newMethods);
                                        }}
                                        className="w-24 border border-slate-200 rounded-xl px-3 py-2 text-right font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
                    <button onClick={handleSaveFinance} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-100 transition-all disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                        Salvar Taxas
                    </button>
                </div>
            </Card>
        </div>
    );

    const tabs = [
        { id: 'studio', label: 'Estúdio', icon: Store },
        { id: 'services', label: 'Serviços', icon: Scissors },
        { id: 'team', label: 'Colaboradores', icon: User },
        { id: 'finance', label: 'Financeiro', icon: Wallet },
        { id: 'schedule', label: 'Horários', icon: Clock },
        { id: 'notifications', label: 'Avisos', icon: Bell },
    ];

    if (activeTab === 'team' && selectedProfessionalId) {
        const selectedProf = colaboradores.find(p => p.id === selectedProfessionalId);
        if (selectedProf) return <ProfessionalDetail professional={selectedProf} services={servicesData} onBack={() => setSelectedProfessionalId(null)} onSave={() => {}} />;
    }

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden relative font-sans">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <aside className={`bg-white border-r border-slate-200 flex-col flex-shrink-0 transition-all w-64 hidden md:flex`}>
                <div className="p-6 border-b border-slate-100 flex items-center h-20">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-slate-400" /> Configurações
                    </h2>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-100' : 'text-slate-500 hover:bg-slate-50'}`}>
                            <tab.icon className="w-5 h-5" /> {tab.label}
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 overflow-y-auto w-full">
                <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{tabs.find(t => t.id === activeTab)?.label}</h3>
                    {activeTab === 'finance' ? renderFinanceTab() : <div className="text-slate-400 italic">Configure as outras abas conforme necessário.</div>}
                </div>
            </main>
        </div>
    );
};

export default ConfiguracoesView;
