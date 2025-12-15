
import React, { useState, useMemo } from 'react';
import { 
    Archive, Lock, Unlock, ArrowUpCircle, ArrowDownCircle, 
    DollarSign, AlertTriangle, Calculator, Calendar, History,
    Save, X, CheckCircle
} from 'lucide-react';
import Card from '../shared/Card';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import Toast, { ToastType } from '../shared/Toast';

// --- Types ---

type CashStatus = 'fechado' | 'aberto';
type MovementType = 'abertura' | 'venda' | 'suprimento' | 'sangria' | 'fechamento';

interface CashMovement {
    id: number;
    type: MovementType;
    description: string;
    amount: number;
    time: Date;
    user: string;
}

interface CashSession {
    id: number;
    date: Date;
    status: CashStatus;
    openingBalance: number;
    closingBalance?: number;
    calculatedBalance?: number;
    difference?: number;
    movements: CashMovement[];
}

// --- Mock Data ---
const initialSession: CashSession = {
    id: 101,
    date: new Date(),
    status: 'fechado',
    openingBalance: 0,
    movements: []
};

// --- Helper Components ---

const StatCard = ({ title, value, icon: Icon, colorClass, textColor }: any) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
            <p className={`text-xl font-bold mt-1 ${textColor}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClass}`}>
            <Icon className="w-5 h-5 text-white" />
        </div>
    </div>
);

// --- Modal Component for Operations ---
interface OperationModalProps {
    type: 'abrir' | 'suprimento' | 'sangria' | 'fechar';
    onClose: () => void;
    onConfirm: (amount: number, description: string) => void;
    currentBalance?: number;
}

const OperationModal: React.FC<OperationModalProps> = ({ type, onClose, onConfirm, currentBalance = 0 }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    const config = {
        abrir: { title: 'Abrir Caixa', color: 'bg-green-600', btnText: 'Iniciar Turno', label: 'Fundo de Troco (R$)' },
        suprimento: { title: 'Nova Entrada (Suprimento)', color: 'bg-blue-600', btnText: 'Adicionar Dinheiro', label: 'Valor (R$)' },
        sangria: { title: 'Nova Saída (Sangria)', color: 'bg-red-600', btnText: 'Retirar Dinheiro', label: 'Valor (R$)' },
        fechar: { title: 'Fechar Caixa', color: 'bg-slate-800', btnText: 'Finalizar Caixa', label: 'Valor Conferido em Gaveta (R$)' },
    };

    const activeConfig = config[type];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) return;
        onConfirm(Number(amount), description);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                <header className={`p-4 ${activeConfig.color} text-white flex justify-between items-center`}>
                    <h3 className="font-bold text-lg">{activeConfig.title}</h3>
