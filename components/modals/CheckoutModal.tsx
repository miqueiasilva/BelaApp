
import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, CheckCircle, Wallet, CreditCard, Banknote, 
    Smartphone, Loader2, ShoppingCart, ArrowRight,
    ChevronDown, Info, Percent, Layers, AlertTriangle,
    User, Receipt, UserCheck, CreditCard as CardIcon,
    ShieldCheck, DollarSign, ArrowUpRight
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import Toast, { ToastType } from '../shared/Toast';

// --- CONFIGURAÇÕES FIXAS DE UI ---
const CARD_BRANDS = ['VISA', 'MASTERCARD', 'ELO', 'HIPERCARD', 'AMEX', 'OUTROS'];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

interface PaymentRate {
    id: string | number;
    method_type: string;
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
        command_id?: string;
    };
    onSuccess: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, appointment, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingRates, setIsLoadingRates] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // --- ESTADOS DE SELEÇÃO ---
    const [rates, setRates] = useState<PaymentRate[]>([]);
    const [selectedMethod, setSelectedMethod] = useState<'pix' | 'money' | 'credit' | 'debit'>('pix');
    const [selectedBrand, setSelectedBrand] = useState<string>('VISA');
    const [installments, setInstallments] = useState<number>(1);

    // 1. CARREGAMENTO DE TAXAS (MDR)
    const fetchRates = async () => {
        setIsLoadingRates(true);
        try {
            const { data, error } = await supabase
                .from('payment_rates')
                .select('*')
                .eq('is_active', true);

            if (error) throw error;
            setRates(data || []);
        } catch (err: any) {
            console.error("[CHECKOUT_V2] Erro ao carregar taxas:", err);
            setToast({ message: "Aviso: Usando taxas zeradas (falha na sincronização).", type: 'info' });
        } finally {
            setIsLoadingRates(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchRates();
    }, [isOpen]);

    // 2. MOTOR DE CÁLCULO FINANCEIRO
    const financialSummary = useMemo(() => {
        // Encontra a taxa correspondente
        const match = rates.find(r => 
            r.method_type === selectedMethod && 
            (selectedMethod === 'pix' || selectedMethod === 'money' || r.brand === selectedBrand) &&
            (selectedMethod !== 'credit' || r.installments === installments)
        );

        const feePercent = match ? Number(match.rate) : 0;
        const feeAmount = (appointment.price * feePercent) / 100;
        const netValue = appointment.price - feeAmount;

        return {
            feePercent,
            feeAmount,
            netValue,
            hasRate: !!match
        };
    }, [rates, selectedMethod, selectedBrand, installments, appointment.price]);

    // 3. FINALIZAÇÃO DA TRANSAÇÃO
    const handleConfirmPayment = async () => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            // A. Registrar o Pagamento Detalhado (command_payments)
            const { error: payError } = await supabase.from('command_payments').insert([{
                command_id: appointment.command_id || null,
                appointment_id: appointment.id,
                amount: appointment.price,
                method: selectedMethod,
                brand: (selectedMethod === 'credit' || selectedMethod === 'debit') ? selectedBrand : null,
                installments: selectedMethod === 'credit' ? installments : 1,
                fee_applied: financialSummary.feePercent,
                net_value: financialSummary.netValue,
                created_at: new Date().toISOString()
            }]);

            if (payError) throw payError;

            // B. Atualizar Agendamento para Concluído
            const { error: apptError } = await supabase
                .from('appointments')
                .update({ status: 'concluido' })
                .eq('id', appointment.id);
            
            if (apptError) throw apptError;

            // C. Fechar Comanda (se existir)
            if (appointment.command_id) {
                await supabase
                    .from('commands')
                    .update({ 
                        status: 'paid', 
                        closed_at: new Date().toISOString(),
                        total_amount: appointment.price 
                    })
                    .eq('id', appointment.command_id);
            }

            // D. Registrar no Fluxo de Caixa (Opcional, se já não houver trigger)
            await supabase.from('financial_transactions').insert([{
                description: `Recebimento: ${appointment.service_name} - ${appointment.client_name}`,
                amount: appointment.price,
                net_value: financialSummary.netValue,
                type: 'income',
                category: 'servico',
                payment_method: selectedMethod,
                professional_id: appointment.professional_id,
                client_id: appointment.client_id,
                date: new Date().toISOString(),
                status: 'paid'
            }]);

            setToast({ message: "Recebimento liquidado com sucesso!", type: 'success' });
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);

        } catch (err: any) {
            setToast({ message: `Erro no processamento: ${err.message}`, type: 'error' });
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
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><ShieldCheck size={24} /></div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase leading-none">Liquidação Final</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Conferência de Taxas e MDR</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-all"><X size={24} /></button>
                </header>

                <main className="p-8 space-y-6">
                    {/* INFO CLIENTE/SERVIÇO */}
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-orange-500 shadow-sm font-black">
                            {appointment.client_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-800 truncate">{appointment.client_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{appointment.service_name}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Total</p>
                            <p className="text-lg font-black text-slate-800">{formatCurrency(appointment.price)}</p>
                        </div>
                    </div>

                    {/* SELEÇÃO DE MÉTODO */}
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { id: 'pix', label: 'Pix', icon: Smartphone, color: 'text-teal-600' },
                            { id: 'money', label: 'Dinheiro', icon: Banknote, color: 'text-green-600' },
                            { id: 'credit', label: 'Crédito', icon: CreditCard, color: 'text-blue-600' },
                            { id: 'debit', label: 'Débito', icon: CreditCard, color: 'text-cyan-600' },
                        ].map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    setSelectedMethod(cat.id as any);
                                    if (cat.id !== 'credit') setInstallments(1);
                                }}
                                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${selectedMethod === cat.id ? 'border-orange-500 bg-orange-50 shadow-md' : 'border-slate-50 bg-white hover:border-slate-200'}`}
                            >
                                <cat.icon size={20} className={cat.color} />
                                <span className="text-[9px] font-black text-slate-700 uppercase mt-1">{cat.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* CAMPOS DINÂMICOS DE CARTÃO */}
                    {(selectedMethod === 'credit' || selectedMethod === 'debit') && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bandeira do Cartão</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {CARD_BRANDS.map(b => (
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

                            {selectedMethod === 'credit' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Parcelas</label>
                                    <div className="relative">
                                        <select 
                                            value={installments}
                                            onChange={(e) => setInstallments(Number(e.target.value))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-slate-700 outline-none appearance-none focus:ring-4 focus:ring-orange-100"
                                        >
                                            {[1,2,3,4,5,6,10,12].map(n => (
                                                <option key={n} value={n}>{n === 1 ? 'À Vista' : `${n}x (sem juros para o cliente)`}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* RESUMO DE LIQUIDAÇÃO */}
                    <div className={`rounded-[32px] p-6 border transition-all ${financialSummary.hasRate ? 'bg-slate-900 border-slate-800 text-white shadow-xl' : 'bg-orange-50 border-orange-100 text-orange-800'}`}>
                        {!financialSummary.hasRate && (
                            <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase bg-white/20 p-2 rounded-lg">
                                <AlertTriangle size={14} /> Taxa não configurada. Aplicando 0%.
                            </div>
                        )}
                        
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                            <span>Taxa MDR ({selectedMethod === 'credit' ? `${installments}x` : 'Vista'})</span>
                            <span className="flex items-center gap-1">
                                <Percent size={10} /> {financialSummary.feePercent}%
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-end mt-4 pt-4 border-t border-white/10">
                            <div>
                                <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">Líquido a Receber</p>
                                <h3 className={`text-3xl font-black tracking-tighter ${financialSummary.hasRate ? 'text-emerald-400' : 'text-orange-600'}`}>
                                    {formatCurrency(financialSummary.netValue)}
                                </h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">Desconto Taxa</p>
                                <p className="text-sm font-bold text-rose-400">-{formatCurrency(financialSummary.feeAmount)}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleConfirmPayment}
                        disabled={isLoading || isLoadingRates}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-5 rounded-[24px] shadow-xl shadow-orange-100 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={22} /> Confirmar Recebimento</>}
                    </button>
                    
                    <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-widest">
                        A liberação deste pagamento gera um log auditável na base de dados.
                    </p>
                </main>
            </div>
        </div>
    );
};

export default CheckoutModal;
