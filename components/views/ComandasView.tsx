
import React, { useState, useMemo, useEffect } from 'react';
import { 
    Search, Plus, Clock, User, FileText, 
    DollarSign, Coffee, Scissors, Trash2, ShoppingBag, X,
    CreditCard, Banknote, Smartphone, CheckCircle, Loader2,
    Receipt, History, LayoutGrid, CheckCircle2, AlertCircle,
    UserCheck, Briefcase
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { FinancialTransaction, PaymentMethod, Client, Command, CommandItem } from '../../types';
import Toast, { ToastType } from '../shared/Toast';
import SelectionModal from '../modals/SelectionModal';
import ClientSearchModal from '../modals/ClientSearchModal';
import { differenceInMinutes, parseISO, format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

interface ComandasViewProps {
    onAddTransaction: (t: FinancialTransaction) => void;
}

type CommandTab = 'open' | 'paid' | 'all';

const ComandasView: React.FC<ComandasViewProps> = ({ onAddTransaction }) => {
    const { user } = useAuth();
    const [tabs, setTabs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentTab, setCurrentTab] = useState<CommandTab>('open');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Modals State
    const [isSelectionOpen, setIsSelectionOpen] = useState(false);
    const [isProfSelectionOpen, setIsProfSelectionOpen] = useState(false);
    const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [pendingItem, setPendingItem] = useState<any>(null);

    // Dados de Catálogo e Equipe
    const [catalog, setCatalog] = useState<any[]>([]);
    const [team, setTeam] = useState<any[]>([]);

    const fetchCommands = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('commands')
                .select('*, clients(id, name, nome, avatar_url, photo_url), command_items(*, team_members(id, name))')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTabs(data || []);
        } catch (e: any) {
            setToast({ message: "Erro ao carregar comandas.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        const [svcs, prods, teamRes] = await Promise.all([
            supabase.from('services').select('id, nome, preco').eq('ativo', true),
            supabase.from('products').select('id, name, price').eq('active', true),
            supabase.from('team_members').select('id, name').eq('active', true)
        ]);

        const items = [
            ...(svcs.data || []).map(s => ({ id: s.id, name: `[Serviço] ${s.nome}`, price: s.preco, type: 'servico' })),
            ...(prods.data || []).map(p => ({ id: p.id, name: `[Produto] ${p.name}`, price: p.price, type: 'produto' }))
        ];
        setCatalog(items);
        setTeam((teamRes.data || []).map(t => ({ id: t.id, name: t.name })));
    };

    useEffect(() => {
        fetchCommands();
        fetchData();
    }, [currentTab]);

    // CORREÇÃO: Validação estrita de client_id
    const handleCreateCommand = async (client: Client) => {
        if (!client.id) {
            setToast({ message: "Erro: Cliente sem ID válido.", type: 'error' });
            return;
        }

        setIsClientSearchOpen(false);
        try {
            const { data, error } = await supabase
                .from('commands')
                .insert([{ client_id: client.id, status: 'open', total_amount: 0 }])
                .select('*, clients(*), command_items(*)')
                .single();

            if (error) throw error;
            setTabs(prev => [data, ...prev]);
            setToast({ message: `Comanda aberta para ${client.nome}!`, type: 'success' });
        } catch (e: any) {
            setToast({ message: "Erro ao abrir comanda no banco.", type: 'error' });
        }
    };

    const handleSelectItemFromCatalog = (item: any) => {
        if (item.type === 'produto') {
            handleAddItemToDB(item, null);
        } else {
            setPendingItem(item);
            setIsSelectionOpen(false);
            setIsProfSelectionOpen(true);
        }
    };

    // CORREÇÃO: Validação estrita de professional_id e Fallback
    const handleAddItemToDB = async (item: any, professionalId: string | null) => {
        if (!activeTabId) return;

        let finalProfId = professionalId;
        
        // Se for serviço, o profissional é obrigatório para comissão
        if (item.type === 'servico' && !finalProfId) {
            // Fallback: Verificar se o usuário logado é da equipe
            const loggedInAsProf = team.find(t => t.id === user?.id);
            if (loggedInAsProf) {
                finalProfId = loggedInAsProf.id;
            } else {
                setToast({ message: "Por favor, selecione um profissional.", type: 'error' });
                setIsProfSelectionOpen(true);
                return;
            }
        }

        try {
            const payload = {
                command_id: activeTabId,
                title: item.name.replace(/\[.*?\]\s/g, ''),
                price: item.price,
                quantity: 1,
                product_id: item.type === 'produto' ? item.id : null,
                service_id: item.type === 'servico' ? item.id : null,
                professional_id: finalProfId
            };

            const { data, error } = await supabase
                .from('command_items')
                .insert([payload])
                .select('*, team_members(id, name)')
                .single();

            if (error) throw error;

            setTabs(prev => prev.map(tab => {
                if (tab.id === activeTabId) {
                    return { 
                        ...tab, 
                        command_items: [...tab.command_items, data],
                        total_amount: Number(tab.total_amount) + Number(data.price)
                    };
                }
                return tab;
            }));

            setIsSelectionOpen(false);
            setIsProfSelectionOpen(false);
            setPendingItem(null);
            setToast({ message: "Item lançado!", type: 'success' });
        } catch (e) {
            setToast({ message: "Erro ao gravar item no banco.", type: 'error' });
        }
    };

    const handleOpenCloseTab = (id: string) => {
        const command = tabs.find(t => t.id === id);
        if (command) window.location.hash = `#/comanda/${command.id}`;
    };

    const filteredTabs = useMemo(() => {
        return tabs.filter(t => {
            const name = (t.clients?.nome || t.clients?.name || '').toLowerCase();
            return name.includes(searchTerm.toLowerCase());
        });
    }, [tabs, searchTerm]);

    return (
        <div className="h-full flex flex-col bg-slate-50 relative font-sans text-left">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-30 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <FileText className="text-orange-500" />
                        Comandas Digitais
                    </h1>
                </div>
                <div className="flex gap-3">
                    <input 
                        type="text" 
                        placeholder="Buscar cliente..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="pl-4 pr-4 py-2.5 bg-slate-100 border border-transparent rounded-xl outline-none font-bold text-slate-700" 
                    />
                    <button onClick={() => setIsClientSearchOpen(true)} className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-black flex items-center gap-2 shadow-lg active:scale-95 text-sm uppercase"><Plus size={20} /> Novo Atendimento</button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={48} /></div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {filteredTabs.map(tab => {
                            const total = tab.command_items.reduce((acc: number, i: any) => acc + (Number(i.price) * i.quantity), 0);
                            const clientName = tab.clients?.nome || tab.clients?.name || 'Cliente Não Identificado';
                            const isPaid = tab.status === 'paid';

                            return (
                                <div key={tab.id} className={`bg-white rounded-[32px] border transition-all flex flex-col overflow-hidden h-[450px] ${isPaid ? 'opacity-60 grayscale shadow-none' : 'shadow-sm hover:shadow-xl hover:border-orange-100'}`}>
                                    <div className="p-5 border-b border-slate-50 flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white ${isPaid ? 'bg-slate-300' : 'bg-orange-500'}`}>
                                            {clientName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-slate-800 text-sm truncate">{clientName}</h3>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{tab.status === 'paid' ? 'Pago' : 'Em Aberto'}</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 p-5 space-y-3 overflow-y-auto">
                                        {tab.command_items.map((item: any) => (
                                            <div key={item.id} className="bg-slate-50 p-3 rounded-2xl border border-transparent">
                                                <p className="text-xs font-bold text-slate-700 truncate">{item.title}</p>
                                                <p className="text-[10px] text-slate-400 font-black mt-1 flex items-center gap-1">
                                                    <UserCheck size={10} className="text-orange-500" />
                                                    {item.team_members?.name || 'NÃO VINCULADO'} • R$ {Number(item.price).toFixed(2)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-5 bg-slate-50 border-t border-slate-100 space-y-3">
                                        {!isPaid && (
                                            <button onClick={() => { setActiveTabId(tab.id); setIsSelectionOpen(true); }} className="w-full py-2.5 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:border-orange-400 transition-all flex items-center justify-center gap-2">
                                                <Plus size={14} /> Adicionar Item
                                            </button>
                                        )}
                                        <div className="flex justify-between items-center px-1">
                                            <p className="text-xl font-black text-slate-800">R$ {total.toFixed(2)}</p>
                                            {!isPaid && (
                                                <button onClick={() => handleOpenCloseTab(tab.id)} className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-lg active:scale-90"><Receipt size={20} /></button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* MODALS DE SELEÇÃO */}
            {isClientSearchOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-md h-[600px] bg-white rounded-[40px] shadow-2xl overflow-hidden">
                        <ClientSearchModal onClose={() => setIsClientSearchOpen(false)} onSelect={handleCreateCommand} onNewClient={() => {}} />
                    </div>
                </div>
            )}

            {isSelectionOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-md h-[550px] bg-white rounded-[40px] shadow-2xl overflow-hidden">
                        <SelectionModal title="O que foi consumido?" items={catalog} onClose={() => setIsSelectionOpen(false)} onSelect={handleSelectItemFromCatalog} searchPlaceholder="Buscar serviço/produto..." renderItemIcon={() => <Plus size={18}/>} />
                    </div>
                </div>
            )}

            {isProfSelectionOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-md h-[550px] bg-white rounded-[40px] shadow-2xl overflow-hidden">
                        <SelectionModal title="Quem realizou o serviço?" items={team} onClose={() => { setIsProfSelectionOpen(false); setPendingItem(null); }} onSelect={(prof) => handleAddItemToDB(pendingItem, String(prof.id))} searchPlaceholder="Selecionar profissional..." renderItemIcon={() => <UserCheck size={18}/>} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComandasView;
