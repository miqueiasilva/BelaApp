
import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, CheckCircle, Wallet, CreditCard, Banknote, 
    Smartphone, Loader2, ShoppingCart, ArrowRight,
    ChevronDown, Info, Percent, Layers, AlertTriangle,
    User, Receipt, UserCheck, UserPlus, CreditCard as CardIcon
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import Toast, { ToastType } from '../shared/Toast';

// --- HELPERS DE FORMATAÇÃO ---
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

interface PaymentRate {
    id: string;
    method_type: 'credit' | 'debit' | 'pix' | 'money';
    brand: string;
    installments: number;
    rate: number;
}

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: {
        id: number;
        client_id?: number | string;
        client_name: string;
        service_name: string;
        price: number;
        professional_id?: number | string; 
        professional_name: string;
        command_id?: string; // ID da comanda pai
    };
    onSuccess: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, appointment, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // --- ESTADOS DE TAXAS E SELEÇÃO ---
    const [rates, setRates] = useState<PaymentRate[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<'pix' | 'money' | 'credit' | 'debit'>('pix');
    const [selectedBrand, setSelectedBrand] = useState<string>('VISA');
    const [installments, setInstallments] = useState(1);

    const brands = ['VISA', 'MASTERCARD', 'ELO', 'HIPERCARD', 'AMEX', 'OUTROS'];

    // 1. FETCH DE TAXAS DO BANCO (payment_rates)
    const loadRates = async () => {
        setIsFetching(true);
        try {
            const { data, error } = await supabase
                .from('payment_rates')
                .select('*')
                .eq('is_active', true);

            if (error) throw error;
            setRates(data || []);
        } catch (err: any) {
            console.error("[CHECKOUT] Erro ao carregar taxas:", err);
            setToast({ message: "Erro ao sincronizar taxas de cartão.", type: 'error' });
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        if (isOpen) loadRates();
    }, [isOpen]);

    // 2. CÁLCULO DE TAXA E VALOR LÍQUIDO EM TEMPO REAL
    const calculation = useMemo(() => {
        // Busca a taxa específica na matriz
        const match = rates.find(r => 
            r.method_type === selectedCategory && 
            (selectedCategory === 'pix' || selectedCategory === 'money' || r.brand === selectedBrand) &&
            (selectedCategory !== 'credit' || r.installments === installments)
        );

        const feeApplied = match ? Number(match.rate) : 0;
        const netValue = appointment.price * (1 - (feeApplied / 100));

        return { feeApplied, netValue };
    }, [rates, selectedCategory, selectedBrand, installments, appointment.price]);

    // 3. FINALIZAÇÃO COM REGISTRO DETALHADO (command_payments)
    const handleFinishCheckout = async () => {
        setIsLoading(true);
        try {
            // A. Registrar o pagamento detalhado
            const { error: payError } = await supabase.from('command_payments').insert([{
                command_id: appointment.command_id || null,
                appointment_id: appointment.id,
                amount: appointment.price,
                method: selectedCategory,
                brand: (selectedCategory === 'credit' || selectedCategory === 'debit') ? selectedBrand : null,
                installments: selectedCategory === 'credit' ? installments : 1,
                fee_applied: calculation.feeApplied,
                net_value: calculation.netValue,
                created_at: new Date().toISOString()
            }]);

            if (payError) throw payError;

            // B. Atualizar Agendamento e Comanda
            await Promise.all([
                supabase.from('appointments').update({ status: 'concluido' }).eq('id', appointment.id),
                appointment.command_id ? supabase.from('commands').update({ status: 'paid', closed_at: new Date().toISOString() }).eq('id', appointment.command_id) : Promise.resolve()
            ]);

            setToast({ message: "Pagamento baixado com sucesso!", type: 'success' });
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);

        } catch (err: any) {
            setToast({ message: `Falha no fechamento: ${err.message}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><CheckCircle size={24} /></div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase leading-none">Checkout Final</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Total a Receber: {formatCurrency(appointment.price)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full"><X size={24} /></button>
                </header>

                <main className="p-8 space-y-6">
                    {/* Seletor de Categoria Principal */}
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { id: 'pix', label: 'Pix', icon: Smartphone, color: 'text-teal-600' },
                            { id: 'money', label: 'Dinheiro', icon: Banknote, color: 'text-green-600' },
                            { id: 'credit', label: 'Crédito', icon: CreditCard, color: 'text-blue-600' },
                            { id: 'debit', label: 'Débito', icon: CreditCard, color: 'text-cyan-600' },
                        ].map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id as any)}
                                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${selectedCategory === cat.id ? 'border-orange-500 bg-orange-50 shadow-md' : 'border-slate-50 bg-white hover:border-slate-200'}`}
                            >
                                <cat.icon size={20} className={cat.color} />
                                <span className="text-[9px] font-black text-slate-700 uppercase mt-1">{cat.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Controles Dinâmicos de Cartão */}
                    {(selectedCategory === 'credit' || selectedCategory === 'debit') && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bandeira do Cartão</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {brands.map(b => (
                                        <button 
                                            key={b}
                                            onClick={() => setSelectedBrand(b)}
                                            className={`py-2 rounded-xl text-[10px] font-black transition-all border ${selectedBrand === b ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-300'}`}
                                        >
                                            {b}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {selectedCategory === 'credit' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Parcelas</label>
                                    <select 
                                        value={installments}
                                        onChange={(e) => setInstallments(Number(e.target.value))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none appearance-none focus:ring-4 focus:ring-orange-100"
                                    >
                                        {[1,2,3,4,5,6,10,12].map(n => (
                                            <option key={n} value={n}>{n === 1 ? 'À Vista' : `${n}x sem juros (ou conforme contrato)`}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Resumo de Liquidação */}
                    <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100 space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>Taxa MDR Aplicada</span>
                            <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">{calculation.feeApplied}%</span>
                        </div>
                        
                        <div className="flex justify-between items-end border-t border-slate-200 pt-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recebimento Líquido</p>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{formatCurrency(calculation.netValue)}</h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desconto Taxas</p>
                                <p className="text-sm font-bold text-rose-500">-{formatCurrency(appointment.price - calculation.netValue)}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleFinishCheckout}
                        disabled={isLoading || isFetching}
                        className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-[24px] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={20} /> Fechar Conta e Baixar</>}
                    </button>
                </main>
            </div>
        </div>
    );
};

export default CheckoutModal;
