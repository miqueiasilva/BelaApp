
import React, { useState, useMemo } from 'react';
import { 
    Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, 
    Banknote, Smartphone, CheckCircle, Package, Scissors, 
    ChevronRight, Eraser, Calendar, User, X, Printer, ArrowRight
} from 'lucide-react';
import { services as mockServices, initialAppointments } from '../../data/mockData';
import { FinancialTransaction, LegacyService, PaymentMethod, Client, LegacyAppointment } from '../../types';
import Toast, { ToastType } from '../shared/Toast';
import { format, isSameDay } from 'date-fns';

// --- Mock Products for POS ---
const mockProducts = [
    { id: 101, name: 'Shampoo Hidratante 300ml', price: 85.00, category: 'Capilar', stock: 12 },
    { id: 102, name: 'Condicionador Reparador', price: 92.00, category: 'Capilar', stock: 8 },
    { id: 103, name: 'Óleo Reparador de Pontas', price: 45.00, category: 'Finalizador', stock: 20 },
    { id: 104, name: 'Máscara de Nutrição', price: 120.00, category: 'Tratamento', stock: 5 },
    { id: 105, name: 'Kit Manicure Descartável', price: 5.00, category: 'Acessórios', stock: 100 },
    { id: 106, name: 'Esmalte Importado Vermelho', price: 35.00, category: 'Esmaltes', stock: 15 },
];

interface CartItem {
    uuid: string; // Unique ID for cart item instance
    id: number;
    name: string;
    price: number;
    type: 'servico' | 'produto';
    quantity: number;
}

interface VendasViewProps {
    onAddTransaction: (t: FinancialTransaction) => void;
}

const ReceiptModal = ({ transaction, onClose, onNewSale }: { transaction: FinancialTransaction, onClose: () => void, onNewSale: () => void }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-green-500 p-6 text-center text-white">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                    <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Venda Realizada!</h2>
                <p className="text-green-100 text-sm">Transação registrada com sucesso.</p>
            </div>
            
            <div className="p-6 space-y-4">
                <div className="text-center space-y-1 border-b border-slate-100 pb-4">
                    <p className="text-xs text-slate-400 uppercase font-bold">Valor Total</p>
                    <p className="text-3xl font-extrabold text-slate-800">R$ {transaction.amount.toFixed(2)}</p>
                    <p className="text-sm text-slate-500 capitalize">{transaction.paymentMethod.replace('_', ' ')}</p>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex justify-between">
                        <span>Data:</span>
                        <span className="font-medium">{format(transaction.date, 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Itens:</span>
                        <span className="font-medium truncate max-w-[200px]">{transaction.description.replace('Venda PDV: ', '')}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={onClose} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition">
                        <Printer size={18} /> Imprimir
                    </button>
                    <button onClick={onNewSale} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 shadow-orange-200 shadow-sm transition">
                        Nova Venda <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    </div>
);

const VendasView: React.FC<VendasViewProps> = ({ onAddTransaction }) => {
    const [activeTab, setActiveTab] = useState<'servicos' | 'produtos' | 'agenda'>('servicos');
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
    const [discount, setDiscount] = useState<string>('');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [lastTransaction, setLastTransaction] = useState<FinancialTransaction | null>(null);

    // --- Derived State ---
    const servicesList = useMemo(() => Object.values(mockServices), []);
    
    // Filter appointments for today that are not paid/done (mock logic: just show all today's appts)
    const todaysAppointments = useMemo(() => {
        return initialAppointments.filter(app => isSameDay(app.start, new Date()));
    }, []);

    const filteredItems = useMemo(() => {
        const term = searchTerm.toLowerCase();
        if (activeTab === 'servicos') {
            return servicesList.filter(s => s.name.toLowerCase().includes(term));
        } else if (activeTab === 'produtos') {
            return mockProducts.filter(p => p.name.toLowerCase().includes(term));
        } else {
            // Agenda filter
            return todaysAppointments.filter(a => a.client?.nome.toLowerCase().includes(term));
        }
    }, [activeTab, searchTerm, servicesList, todaysAppointments]);

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const discountValue = parseFloat(discount) || 0;
    const total = Math.max(0, subtotal - discountValue);

    // --- Handlers ---

    const addToCart = (item: any, type: 'servico' | 'produto') => {
        setCart(prev => {
            const existingIndex = prev.findIndex(i => i.id === item.id && i.type === type);
            if (existingIndex >= 0) {
                const newCart = [...prev];
                newCart[existingIndex].quantity += 1;
                return newCart;
            }
            return [...prev, {
                uuid: Math.random().toString(36).substr(2, 9),
                id: item.id,
                name: item.name,
                price: item.price,
                type,
                quantity: 1
            }];
        });
    };

    const importAppointment = (app: LegacyAppointment) => {
        addToCart(app.service, 'servico');
        if (app.client) {
            setSelectedClient(app.client);
            setToast({ message: `Cliente ${app.client.nome} vinculado à venda!`, type: 'info' });
        }
    };

    const updateQuantity = (index: number, delta: number) => {
        setCart(prev => {
            const newCart = [...prev];
            const item = newCart[index];
            item.quantity += delta;
            if (item.quantity <= 0) return prev.filter((_, i) => i !== index);
            return newCart;
        });
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const clearCart = () => {
        if (cart.length === 0) return;
        if (window.confirm('Tem certeza que deseja cancelar esta venda e limpar o carrinho?')) {
            resetSaleState();
        }
    };

    const resetSaleState = () => {
        setCart([]);
        setDiscount('');
        setSelectedClient(null);
        setPaymentMethod('pix');
        setLastTransaction(null);
    };

    const handleCheckout = () => {
        if (cart.length === 0) return;

        const description = selectedClient 
            ? `Venda PDV - ${selectedClient.nome}: ${cart.map(i => i.name).join(', ')}`
            : `Venda PDV: ${cart.map(i => `${i.quantity}x ${i.name}`).join(', ')}`;

        const transaction: FinancialTransaction = {
            id: Date.now(),
            description: description,
            amount: total,
            type: 'receita',
            category: cart.some(i => i.type === 'produto') ? 'produto' : 'servico',
            date: new Date(),
            paymentMethod: paymentMethod,
            status: 'pago',
            clientId: selectedClient?.id
        };

        onAddTransaction(transaction);
        setLastTransaction(transaction); // Trigger Modal
    };

    const paymentMethodsConfig = [
        { id: 'pix', label: 'Pix', icon: Smartphone, color: 'bg-teal-500' },
        { id: 'cartao_credito', label: 'Crédito', icon: CreditCard, color: 'bg-blue-500' },
        { id: 'cartao_debito', label: 'Débito', icon: CreditCard, color: 'bg-cyan-500' },
        { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'bg-green-500' },
    ];

    return (
        <div className="h-full flex flex-col md:flex-row bg-slate-50 overflow-hidden relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            {/* Success Modal */}
            {lastTransaction && (
                <ReceiptModal 
                    transaction={lastTransaction} 
                    onClose={() => setLastTransaction(null)} 
                    onNewSale={resetSaleState} 
                />
            )}

            {/* LEFT COLUMN: CATALOG */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200">
                {/* Header Search & Tabs */}
                <div className="bg-white p-4 border-b border-slate-200 space-y-4">
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                        <button 
                            onClick={() => setActiveTab('servicos')}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'servicos' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Scissors size={16} /> Serviços
                        </button>
                        <button 
                            onClick={() => setActiveTab('produtos')}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'produtos' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Package size={16} /> Produtos
                        </button>
                        <button 
                            onClick={() => setActiveTab('agenda')}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'agenda' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Calendar size={16} /> Agenda
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder={activeTab === 'agenda' ? "Buscar agendamento..." : `Buscar ${activeTab}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                        />
                    </div>
                </div>

                {/* Grid Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    {/* AGENDA VIEW */}
                    {activeTab === 'agenda' ? (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase px-1">Agendamentos de Hoje</h3>
                            {filteredItems.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <Calendar className="mx-auto w-12 h-12 mb-2 opacity-20"/>
                                    <p>Nenhum agendamento encontrado.</p>
                                </div>
                            ) : (
                                filteredItems.map((app: any) => (
                                    <button 
                                        key={app.id}
                                        onClick={() => importAppointment(app)}
                                        className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-orange-400 hover:shadow-md transition-all text-left flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex flex-col items-center justify-center text-slate-600 font-bold border border-slate-200">
                                                <span className="text-xs">{format(app.start, 'HH:mm')}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{app.client?.nome || 'Cliente'}</h4>
                                                <p className="text-sm text-slate-500">{app.service.name} • {app.professional.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-slate-700">R$ {app.service.price.toFixed(2)}</span>
                                            <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
                                                <Plus size={18} />
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    ) : (
                        /* CATALOG VIEW (Products/Services) */
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredItems.map((item: any) => (
                                <button 
                                    key={item.id}
                                    onClick={() => addToCart(item, activeTab === 'servicos' ? 'servico' : 'produto')}
                                    className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-orange-400 hover:shadow-md transition-all text-left flex flex-col h-full group"
                                >
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                                {item.category || (activeTab === 'servicos' ? 'Serviço' : 'Produto')}
                                            </span>
                                            {activeTab === 'produtos' && (
                                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                                    Est: {item.stock}
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-sm leading-tight mb-2 line-clamp-2">{item.name}</h4>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="font-bold text-lg text-slate-700">
                                            R$ {item.price.toFixed(2)}
                                        </span>
                                        <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                            <Plus size={18} />
                                        </div>
                                    </div>
                                </button>
                            ))}
                            {filteredItems.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
                                    <Search size={48} className="mb-2 opacity-20" />
                                    <p>Nenhum item encontrado.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: CART & CHECKOUT */}
            <div className="w-full md:w-[400px] bg-white flex flex-col shadow-xl z-10">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <ShoppingCart className="text-orange-500" size={20} />
                        Carrinho ({cart.length})
                    </h3>
                    {selectedClient && (
                        <div className="flex items-center gap-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-bold">
                            <User size={12} /> {selectedClient.nome}
                            <button onClick={() => setSelectedClient(null)} className="hover:text-blue-900"><X size={12}/></button>
                        </div>
                    )}
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                                <ShoppingCart size={40} />
                            </div>
                            <div className="text-center">
                                <p className="font-medium">Carrinho vazio</p>
                                <p className="text-xs mt-1">Selecione itens ou importe um agendamento.</p>
                            </div>
                        </div>
                    ) : (
                        cart.map((item, index) => (
                            <div key={item.uuid} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 text-sm truncate">{item.name}</p>
                                    <p className="text-xs text-slate-500">R$ {item.price.toFixed(2)} un.</p>
                                </div>
                                <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm">
                                    <button onClick={() => updateQuantity(index, -1)} className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-l-lg transition">
                                        <Minus size={14} />
                                    </button>
                                    <span className="w-8 text-center text-sm font-bold text-slate-800">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(index, 1)} className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-r-lg transition">
                                        <Plus size={14} />
                                    </button>
                                </div>
                                <div className="text-right min-w-[60px]">
                                    <p className="font-bold text-slate-800 text-sm">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                                <button onClick={() => removeFromCart(index)} className="text-slate-400 hover:text-red-500 transition">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Summary & Checkout Section */}
                <div className="bg-slate-50 p-5 border-t border-slate-200 space-y-4">
                    {/* Discount Input */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Subtotal</span>
                        <span className="text-sm font-bold text-slate-800">R$ {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Desconto (R$)</span>
                        <input 
                            type="number" 
                            placeholder="0,00"
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                            className="w-24 px-2 py-1 text-right text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-orange-500"
                        />
                    </div>
                    
                    <div className="border-t border-slate-200 my-2"></div>
                    
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-slate-800">Total</span>
                        <span className="text-2xl font-extrabold text-orange-600">R$ {total.toFixed(2)}</span>
                    </div>

                    {/* Payment Method Selector */}
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

                    <div className="flex gap-3 pt-2">
                        <button 
                            onClick={clearCart}
                            disabled={cart.length === 0}
                            className="px-4 bg-white border border-slate-300 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Cancelar Venda"
                        >
                            <Trash2 size={20} />
                        </button>
                        <button 
                            onClick={handleCheckout}
                            disabled={cart.length === 0}
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <CheckCircle size={20} />
                            Finalizar Venda
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendasView;
