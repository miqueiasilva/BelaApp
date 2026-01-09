
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Plus, Scissors, Clock, DollarSign, Edit2, Trash2, 
    Loader2, Search, X, CheckCircle, AlertTriangle, RefreshCw,
    LayoutGrid, List, FileSpreadsheet, SlidersHorizontal, ChevronRight,
    Tag, MoreVertical, Filter, Download, ArrowUpRight, FolderPlus
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useStudio } from '../../contexts/StudioContext';
import { Service } from '../../types';
import Toast, { ToastType } from '../shared/Toast';
import ServiceModal from '../modals/ServiceModal';

const ServicosView: React.FC = () => {
    const { activeStudioId } = useStudio();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const fetchServices = async () => {
        if (!activeStudioId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('studio_id', activeStudioId)
                .order('nome');
            if (error) throw error;
            setServices(data || []);
        } catch (error: any) {
            setToast({ message: "Erro ao carregar catálogo.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchServices(); }, [activeStudioId]);

    const handleSave = async (payload: any) => {
        if (!activeStudioId) return;
        try {
            const dataToSave = { ...payload, studio_id: activeStudioId };
            const isEdit = !!payload.id;
            const { error } = isEdit 
                ? await supabase.from('services').update(dataToSave).eq('id', payload.id)
                : await supabase.from('services').insert([dataToSave]);
            if (error) throw error;
            setToast({ message: isEdit ? 'Serviço atualizado!' : 'Serviço cadastrado!', type: 'success' });
            fetchServices();
            setIsModalOpen(false);
        } catch (error: any) { setToast({ message: error.message, type: 'error' }); }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Deseja excluir este serviço?")) {
            const { error } = await supabase.from('services').delete().eq('id', id);
            if (!error) { fetchServices(); setToast({ message: 'Removido.', type: 'info' }); }
        }
    };

    const filtered = services.filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="h-full flex flex-col bg-slate-50 font-sans text-left overflow-hidden">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="text-xl font-black text-slate-800 flex items-center gap-2"><Scissors className="text-orange-500" /> Serviços</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Catálogo de Procedimentos da Unidade</p>
                </div>
                <button onClick={() => { setEditingService(null); setIsModalOpen(true); }} className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-lg active:scale-95">NOVO SERVIÇO</button>
            </header>
            <div className="p-4 bg-white border-b border-slate-100">
                <input type="text" placeholder="Buscar procedimento..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-md px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
            </div>
            <main className="flex-1 overflow-y-auto p-6">
                {loading ? <div className="flex justify-center p-20"><Loader2 className="animate-spin text-orange-500" /></div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(s => (
                            <div key={s.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: s.cor_hex || '#f97316' }}></div>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-black text-slate-800 leading-tight pr-4">{s.nome}</h3>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setEditingService(s); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-orange-500"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.duracao_min} min</span>
                                    <span className="text-lg font-black text-slate-800">R$ {Number(s.preco).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            {isModalOpen && <ServiceModal service={editingService} onClose={() => setIsModalOpen(false)} onSave={handleSave} availableCategories={[]} />}
        </div>
    );
};

export default ServicosView;
