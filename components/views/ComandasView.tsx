
import React, { useState, useMemo } from 'react';
import { 
    Search, Plus, Clock, User, FileText, 
    DollarSign, Coffee, Scissors, Trash2, ShoppingBag, X,
    CreditCard, Banknote, Smartphone, CheckCircle
} from 'lucide-react';
import { FinancialTransaction, PaymentMethod } from '../../types';
import Toast, { ToastType } from '../shared/Toast';
import SelectionModal from '../modals/SelectionModal';
import { differenceInMinutes } from 'date-fns';
import { services as servicesMap } from '../../data/mockData';

// --- Mock Data ---
const mockProducts = [
    { id: 101, name: 'Shampoo Hidratante 300ml', price: 85.00, type: 'produto' },
    { id: 102, name: 'Condicionador Reparador', price: 92.00, type: 'produto' },
    { id: 103, name: 'Óleo Reparador', price: 45.00, type: 'produto' },
    { id: 104, name: 'Máscara de Nutrição', price: 120.00, type: 'produto' },
    { id: 201, name: 'Café Expresso', price: 5.00, type: 'cortesia' },
    { id: 202, name: 'Água com Gás', price: 4.00, type: 'produto' },
];

const servicesList = Object.values(servicesMap).map(s => ({ ...s, type: 'servico' }));

const initialTabs = [
    {
        id: 101,
        clientName: 'Juanita Estefano',
        avatar: 'https://i.pravatar.cc/150?img=2',
        startTime: new Date(new Date().getTime() - 1000 * 60 * 45), // 45 mins ago
        items: [
            { id: 1, name: 'Design com Tintura', price: 70.00, type: 'servico' },
            { id: 201, name: 'Café Expresso', price: 0.00, type: 'cortesia' }
        ],
        status: 'em_andamento',
        professionalName: 'Jaciene'
    },
    {
        id: 102,
        clientName: 'Clara Coelho',
        avatar: 'https://i.pravatar.cc/150?img=3',
        startTime: new Date(new Date().getTime() - 1000 * 60 * 120), // 2 hours ago
        items: [
            { id: 3, name: 'Volume Egípcio', price: 250.00, type: 'servico' },
            { id: 103, name: 'Kit Manutenção', price: 45.00, type: 'produto' }
        ],
        status: 'aguardando_pagamento',
        professionalName: 'Jéssica'
    }
];

interface ComandasViewProps {
    onAddTransaction: (t: FinancialTransaction) => void;
}

const ComandasView: React.FC<ComandasViewProps> = ({ onAddTransaction }) => {
    const [tabs, setTabs] = useState(initialTabs);
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Modals State
    const [isSelectionOpen, setIsSelectionOpen] = useState(false);
    const [activeTabId, setActiveTabId] = useState<number | null>(null);
    
    // New Tab Modal State
    const [isNewTabModalOpen, setIsNewTabModalOpen] = useState(false);
    const [newClientName, setNewClientName] = useState('');

    // Close Tab Modal State
    const [closingTab, setClosingTab] = useState<any | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');

    const filteredTabs = useMemo(() => {
        return tabs.filter(t => t.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [tabs, searchTerm]);

    const selectableItems = useMemo(() => {
        return [
            ...servicesList.map(s => ({ id: s.id, name: `[Serviço] ${s.name}`, price: s.price, type: 'servico' })),
            ...mockProducts.map(p => ({ id: p.id, name: `[Produto] ${p.name}`, price: p.price, type: p.type }))
        ];
    }, []);

    // --- Handlers ---

    // 1. New Comanda
    const handleOpenNewTab = () => {
        setNewClientName('');
        setIsNewTabModalOpen(true);
    };

    const handleConfirmNewTab = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClientName.trim()) return;

        const newTab = {
            id: Date.now(),
            clientName: newClientName,
            avatar: `https://ui-avatars.com/api/?name=${newClientName}&background=random`,
            startTime: new Date(),
            items: [],
            status: 'em_andamento',
            professionalName: 'Recepção'
        };
        setTabs(prev => [newTab as any, ...prev]);
        setIsNewTabModalOpen(false);
        setToast({ message: 'Comanda aberta com sucesso!', type: 'success' });
    };

    // 2. Add Items
    const handleOpenAddItemModal = (tabId: number) => {
        setActiveTabId(tabId);
        setIsSelectionOpen(true);
    };

    const handleAddItem = (item: any) => {
        if (!activeTabId) return;

        setTabs(prev => prev.map(tab => {
            if (tab.id === activeTabId) {
                const finalPrice = item.type === 'cortesia' ? 0 : item.price;
                return {
                    ...tab,
                    items: [...tab.items, { 
                        id: Date.now(), 
                        name: item.name.replace(/\[.*?\]\s/g, ''),
                        price: finalPrice, 
                        type: item.type 
                    }]
                };
            }
            return tab;
        }));

        setIsSelectionOpen(false);
        setActiveTabId(null);
        setToast({ message: 'Item adicionado à comanda.', type: 'success' });
    };

    const handleRemoveItem = (tabId: number, itemIndex: number) => {
        setTabs(prev => prev.map(tab => {
            if (tab.id === tabId) {
                const newItems = [...tab.items];
                newItems.splice(itemIndex, 1);
                return { ...tab, items: newItems };
            }
            return tab;
        }));
    };

    // 3. Close Tab
    const handleOpenCloseTab = (tabId: number) => {
        const tab = tabs.find(t => t.id === tabId);
        if (tab) {
            setClosingTab(tab);
            setPaymentMethod('pix');
        }
    };

    const handleConfirmCloseTab = () => {
        if (!closingTab) return;
        const total = closingTab.items.reduce((acc: any, i: any) => acc + i.price, 0);

        const transaction: FinancialTransaction = {
            id: Date.now(),
            description: `Comanda #${closingTab.id} - ${closingTab.clientName}`,
            amount: total,
            type: 'receita',
            category: 'servico',
            date: new Date(),
            paymentMethod: paymentMethod,
            status: 'pago'
        };

        onAddTransaction(transaction);
        setTabs(prev => prev.filter(t => t.id !== closingTab.id));
        setClosingTab(null);
        setToast({ message: 'Comanda finalizada e enviada para o caixa!', type: 'success' });
    };

    const paymentMethodsConfig = [
        { id: 'pix', label: 'Pix', icon: Smartphone, color: 'bg-teal-500' },
        { id: 'cartao_credito', label: 'Crédito', icon: CreditCard, color: 'bg-blue-500' },
        { id: 'cartao_debito', label: 'Débito', icon: CreditCard, color: 'bg-cyan-500' },
        { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'bg-green-500' },
    ];

    return (
        <div className="h-full flex flex-col bg-slate-50 relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-orange-500" />
                        Comandas Digitais
                    </h1>
                    <p className="text-slate-500 text-sm">Gerencie o consumo dos clientes em tempo real.</p>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Buscar cliente..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border-transparent rounded-xl focus:bg-white focus:border-orange-200 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                        />
                    </div>
                    <button 
                        onClick={handleOpenNewTab}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-200 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline">Nova Comanda</span>
                    </button>
                </div>
            </header>

            {/* Content - Grid of Tabs */}
            <div className="flex-1 overflow-y-auto p-6">
                {filteredTabs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                        <FileText size={64} className="mb-4" />
                        <p className="text-lg font-medium">Nenhuma comanda aberta.</p>
                        <button onClick={handleOpenNewTab} className="mt-4 text-orange-500 font-bold hover:underline">Criar a primeira comanda</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredTabs.map(tab => {
                            const total = tab.items.reduce((acc, i) => acc + i.price, 0);
                            const duration = differenceInMinutes(new Date(), tab.startTime);
                            const hours = Math.floor(duration / 60);
                            const mins = duration % 60;

                            return (
                                <div key={tab.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group h-[420px]">
                                    {/* Card Header */}
                                    <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-gradient-to-r from-white to-slate-50 flex-shrink-0">
                                        <div className="flex items-center gap-3">
                                            <img src={tab.avatar} alt={tab.clientName} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-sm truncate max-w-[120px]">{tab.clientName}</h3>
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <User size={10} />
                                                    <span>{tab.professionalName}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                            tab.status === 'aguardando_pagamento' 
                                            ? 'bg-green-50 text-green-700 border-green-100' 
                                            : 'bg-blue-50 text-blue-700 border-blue-100'
                                        }`}>
                                            {tab.status === 'aguardando_pagamento' ? 'Fechando' : 'Aberta'}
                                        </div>
                                    </div>

                                    {/* Items List */}
                                    <div className="flex-1 p-4 bg-slate-50/50 space-y-2 overflow-y-auto">
                                        {tab.items.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                                <ShoppingBag size={24} className="mb-2 opacity-50"/>
                                                <p className="text-xs italic">Nenhum item lançado.</p>
                                            </div>
                                        ) : (
                                            tab.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm group/item bg-white p-2 rounded border border-slate-100 shadow-sm">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        {item.type === 'cortesia' ? <Coffee size={14} className="text-amber-500 flex-shrink-0"/> : 
                                                         item.type === 'produto' ? <ShoppingBag size={14} className="text-purple-500 flex-shrink-0"/> : 
                                                         <Scissors size={14} className="text-blue-500 flex-shrink-0"/>}
                                                        <span className="text-slate-700 truncate">{item.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                        <span className={`font-medium ${item.price === 0 ? 'text-green-600 text-xs uppercase' : 'text-slate-800'}`}>
                                                            {item.price === 0 ? 'Grátis' : `R$ ${item.price.toFixed(2)}`}
                                                        </span>
                                                        <button 
                                                            onClick={() => handleRemoveItem(tab.id, idx)}
                                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Footer / Actions */}
                                    <div className="p-4 bg-white border-t border-slate-100 flex-shrink-0 space-y-3">
                                        <button 
                                            onClick={() => handleOpenAddItemModal(tab.id)}
                                            className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-500 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition flex items-center justify-center gap-1"
                                        >
                                            <Plus size={14} /> Adicionar Serviço / Produto
                                        </button>

                                        <div className="flex justify-between items-center pt-2">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                                <Clock size={12} />
                                                <span>{hours > 0 ? `${hours}h ` : ''}{mins}m</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-400 uppercase font-bold">Total</p>
                                                <p className="text-xl font-bold text-slate-800">R$ {total.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleOpenCloseTab(tab.id)}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <DollarSign size={18} />
                                            Fechar Conta
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* MODAL 1: New Comanda */}
            {isNewTabModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                        <header className="p-4 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Abrir Nova Comanda</h3>
                            <button onClick={() => setIsNewTabModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                        </header>
                        <form onSubmit={handleConfirmNewTab} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Nome do Cliente</label>
                                <input 
                                    autoFocus
                                    type="text"
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    placeholder="Ex: Maria Silva"
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={!newClientName.trim()}
                                className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Iniciar Atendimento
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: Close Tab */}
            {closingTab && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <header className="p-4 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Fechar Conta</h3>
                            <button onClick={() => setClosingTab(null)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                        </header>
                        <div className="p-6 space-y-6">
                            <div className="text-center">
                                <img src={closingTab.avatar} alt="" className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-white shadow-md" />
                                <h2 className="text-lg font-bold text-slate-800">{closingTab.clientName}</h2>
                                <p className="text-slate-500 text-sm">{closingTab.items.length} itens consumidos</p>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="flex justify-between items-end">
                                    <span className="text-slate-500 font-medium">Total a Pagar</span>
                                    <span className="text-3xl font-bold text-slate-800">
                                        R$ {closingTab.items.reduce((acc: any, i: any) => acc + i.price, 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Forma de Pagamento</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {paymentMethodsConfig.map(pm => (
                                        <button
                                            key={pm.id}
                                            onClick={() => setPaymentMethod(pm.id as PaymentMethod)}
                                            className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                                                paymentMethod === pm.id 
                                                ? `${pm.color} text-white border-transparent shadow-md` 
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <pm.icon size={20} className="mb-1" />
                                            <span className="text-[10px] font-bold">{pm.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={handleConfirmCloseTab}
                                className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={20} />
                                Confirmar Pagamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Selection Modal for Adding Items */}
            {isSelectionOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
                    <div className="relative w-full max-w-md h-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <SelectionModal
                            title="Adicionar Item à Comanda"
                            items={selectableItems}
                            onClose={() => { setIsSelectionOpen(false); setActiveTabId(null); }}
                            onSelect={handleAddItem}
                            searchPlaceholder="Buscar serviço ou produto..."
                            renderItemIcon={() => <Plus size={18}/>}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComandasView;
