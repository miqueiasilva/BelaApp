
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
    Search, ShoppingCart, Plus, Trash2, CreditCard, 
    CheckCircle, Package, Scissors, UserPlus, ArrowRight, Loader2, X, User as UserIcon, Briefcase
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { Product, Service, Client, PaymentMethod, FinancialTransaction, LegacyProfessional } from '../../types';
import Toast, { ToastType } from '../shared/Toast';

interface CartItem {
    id: number;
    name: string;
    price: number;
    type: 'servico' | 'produto';
    quantity: number;
}

const VendasView: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [professionals, setProfessionals] = useState<LegacyProfessional[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedProfessional, setSelectedProfessional] = useState<LegacyProfessional | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeTab, setActiveTab] = useState<'servicos' | 'produtos'>('servicos');
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        setToast({ message, type });
    }, []);

    const fetchData = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        try {
            const [cRes, sRes, pRes, profRes] = await Promise.all([
                supabase.from('clients').select('*').order('nome').abortSignal(controller.signal),
                supabase.from('services').select('*').eq('ativo', true).order('nome').abortSignal(controller.signal),
                supabase.from('products').select('*').eq('ativo', true).order('nome').abortSignal(controller.signal),
                supabase.from('professionals').select('*').eq('active', true).order('name').abortSignal(controller.signal)
            ]);

            setClients(cRes.data || []);
            setServices(sRes.data || []);
            setProducts(pRes.data || []);
            setProfessionals(profRes.data || []);
        } catch (e: any) {
            if (e.name !== 'AbortError') showToast("Erro ao carregar catálogo: " + e.message, "error");
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchData();
        return () => abortControllerRef.current?.abort();
    }, [fetchData]);

    const addToCart = (item: any, type: 'servico' | 'produto') => {
        setCart(prev => {
            const exists = prev.find(i => i.id === item.id && i.type === type);
            if (exists) return prev.map(i => (i.id === item.id && i.type === type) ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { id: item.id, name: item.nome, price: item.preco, type, quantity: 1 }];
        });
    };

    const removeFromCart = (index: number) => setCart(prev => prev.filter((_, i) => i !== index));

    const total = useMemo(() => cart.reduce((acc, i) => acc + (i.price * i.quantity), 0), [cart]);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setIsSaving(true);

        try {
            // 1. Criar o Pedido (Order)
            const { data: order, error: oErr } = await supabase.from('orders').insert([{
                client_id: selectedClient?.id || null,
                total: total,
                status: 'fechada'
            }]).select().single();
            if (oErr) throw oErr;

            // 2. Criar Transação Financeira (Income)
            const { error: tErr } = await supabase.from('financial_transactions').insert([{
                description: `Venda #${order.id} - ${selectedClient?.nome || 'Cliente Balcão'}`,
                amount: total,
                type: 'receita',
                category: cart.some(i => i.type === 'produto') ? 'produto' : 'servico',
                payment_method: paymentMethod,
                date: new Date().toISOString(),
                status: 'pago',
                professional_id: selectedProfessional?.id || null,
                client_id: selectedClient?.id || null
            }]);
            if (tErr) throw tErr;

            // 3. Atualizar Estoque e vincular itens se necessário
            for (const item of cart) {
                if (item.type === 'produto') {
                    const prod = products.find(p => p.id === item.id);
                    if (prod) {
                        const newQtd = Math.max(0, prod.qtd - item.quantity);
                        await supabase.from('products').update({ qtd: newQtd }).eq('id', prod.id);
                    }
                }
            }

            showToast('Venda finalizada com sucesso!');
            setCart([]);
            setSelectedClient(null);
            setSelectedProfessional(null);
            fetchData();
        } catch (e: any) {
            showToast(`Erro ao finalizar: ${e.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredItems = useMemo(() => {
        const term = searchTerm.toLowerCase();
        if (activeTab === 'servicos') return services.filter(s => s.nome.toLowerCase().includes(term));
        return products.filter(p => p.nome.toLowerCase().includes(term));
    }, [activeTab, searchTerm, services, products]);

    return (
        <div className="h-full flex flex-col md:flex-row bg-slate-50 overflow-hidden relative font-sans">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Catálogo de Seleção */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200">
                <div className="bg-white p-6 border-b border-slate-200 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                             <ShoppingCart className="text-orange-500" /> PDV - BelaApp
                        </h2>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button onClick={() => setActiveTab('servicos')} className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'servicos' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Serviços</button>
                            <button onClick={() => setActiveTab('produtos')} className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'produtos' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Produtos</button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder={`Buscar no catálogo de ${activeTab}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center text-slate-400 gap-2 font-medium animate-pulse">
                            <Loader2 className="animate-spin" /> Carregando catálogo...
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredItems.map(item => (
                                <button key={item.id} onClick={() => addToCart(item, activeTab === 'servicos' ? 'servico' : 'produto')} className="bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm hover:border-orange-300 hover:shadow-xl transition-all text-left flex flex-col h-full group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-12 h-12 bg-orange-50 rounded-bl-[28px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus size={16} className="text-orange-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className={`w-8 h-8 rounded-lg mb-3 flex items-center justify-center ${activeTab === 'servicos' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>
                                            {activeTab === 'servicos' ? <Scissors size={14}/> : <Package size={14}/>}
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-sm leading-tight mb-2 group-hover:text-orange-600 transition-colors">{item.nome}</h4>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                                        <p className="font-black text-slate-900">R$ {item.preco.toFixed(2)}</p>
                                        {activeTab === 'produtos' && <span className="text-[10px] font-black text-slate-400">{item.qtd} un</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Checkout / Carrinho */}
            <div className="w-full md:w-[420px] bg-white flex flex-col shadow-2xl z-10 border-l border-slate-100">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                         Carrinho de Compras
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular Cliente</label>
                            <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 font-bold text-slate-700" value={selectedClient?.id || ''} onChange={(e) => setSelectedClient(clients.find(c => c.id === Number(e.target.value)) || null)}>
                                <option value="">Consumidor Final (Balcão)</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Profissional Responsável</label>
                            <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 font-bold text-slate-700" value={selectedProfessional?.id || ''} onChange={(e) => setSelectedProfessional(professionals.find(p => p.id === Number(e.target.value)) || null)}>
                                <option value="">Não atribuído</option>
                                {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-hide bg-slate-50/20">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 italic text-sm gap-2">
                             <ShoppingCart size={40} className="opacity-10" />
                             O carrinho está vazio.
                        </div>
                    ) : cart.map((item, idx) => (
                        <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-4">
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">{item.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{item.type} • {item.quantity}x R$ {item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => removeFromCart(idx)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                    <Trash2 size={16} />
                                </button>
                                <span className="font-black text-slate-800 text-sm w-20 text-right">R$ {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-50 p-6 border-t border-slate-200 space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Valor Total</span>
                            <span className="text-4xl font-black text-orange-600">R$ {total.toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {['pix', 'cartao_credito', 'cartao_debito', 'dinheiro'].map(m => (
                                <button key={m} onClick={() => setPaymentMethod(m as any)} className={`py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${paymentMethod === m ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'}`}>{m.replace('_', ' ')}</button>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleCheckout} disabled={cart.length === 0 || isSaving} className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-[24px] shadow-2xl shadow-slate-300 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSaving ? <Loader2 className="animate-spin" /> : <><CheckCircle size={20} /> FINALIZAR PAGAMENTO</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VendasView;
