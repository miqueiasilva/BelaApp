
import React, { useState, useMemo } from 'react';
import { 
    Archive, Lock, Unlock, ArrowUpCircle, ArrowDownCircle, 
    DollarSign, AlertTriangle, Calculator, Calendar, History,
    Save, X, CheckCircle
} from 'lucide-react';
import Card from '../shared/Card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
                    <button onClick={onClose}><X className="w-5 h-5 opacity-80 hover:opacity-100"/></button>
                </header>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {type === 'fechar' && (
                        <div className="bg-slate-100 p-3 rounded-lg text-center mb-4">
                            <p className="text-xs text-slate-500 uppercase font-bold">Saldo Esperado no Sistema</p>
                            <p className="text-2xl font-bold text-slate-800">R$ {currentBalance.toFixed(2)}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">{activeConfig.label}</label>
                        <input 
                            type="number" 
                            step="0.01"
                            autoFocus
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-slate-400 outline-none"
                            placeholder="0,00"
                        />
                    </div>
                    
                    {type !== 'abrir' && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Motivo / Descrição</label>
                            <input 
                                type="text" 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-4 py-2 text-slate-600 focus:ring-2 focus:ring-slate-400 outline-none"
                                placeholder={type === 'sangria' ? "Ex: Pagamento Fornecedor" : "Ex: Troco adicional"}
                            />
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={!amount}
                        className={`w-full py-3 rounded-xl text-white font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${activeConfig.color}`}
                    >
                        {activeConfig.btnText}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Main View ---

const CaixaView: React.FC = () => {
    const [session, setSession] = useState<CashSession>(initialSession);
    const [modalType, setModalType] = useState<'abrir' | 'suprimento' | 'sangria' | 'fechar' | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // --- Derived Metrics ---
    const stats = useMemo(() => {
        const totalIn = session.movements
            .filter(m => m.type === 'suprimento' || m.type === 'venda')
            .reduce((acc, m) => acc + m.amount, 0);
        
        const totalOut = session.movements
            .filter(m => m.type === 'sangria')
            .reduce((acc, m) => acc + m.amount, 0);

        // Current balance includes opening balance
        const currentBalance = session.openingBalance + totalIn - totalOut;

        return { totalIn, totalOut, currentBalance };
    }, [session]);

    // --- Handlers ---

    const handleOpenBox = (amount: number) => {
        setSession({
            ...session,
            status: 'aberto',
            openingBalance: amount,
            date: new Date(),
            movements: [
                { id: Date.now(), type: 'abertura', description: 'Abertura de Caixa', amount: amount, time: new Date(), user: 'Jacilene' }
            ]
        });
        setModalType(null);
        setToast({ message: 'Caixa aberto com sucesso!', type: 'success' });
    };

    const handleMovement = (amount: number, description: string) => {
        if (!modalType) return;
        
        const type = modalType === 'suprimento' ? 'suprimento' : 'sangria';
        const finalDescription = description || (type === 'suprimento' ? 'Suprimento de Caixa' : 'Sangria de Caixa');

        const newMovement: CashMovement = {
            id: Date.now(),
            type: type,
            description: finalDescription,
            amount: amount,
            time: new Date(),
            user: 'Jacilene'
        };

        setSession(prev => ({
            ...prev,
            movements: [newMovement, ...prev.movements]
        }));
        setModalType(null);
        setToast({ message: 'Movimentação registrada!', type: 'success' });
    };

    const handleCloseBox = (countedAmount: number) => {
        const diff = countedAmount - stats.currentBalance;
        
        setSession(prev => ({
            ...prev,
            status: 'fechado',
            closingBalance: countedAmount,
            calculatedBalance: stats.currentBalance,
            difference: diff,
            movements: [
                { id: Date.now(), type: 'fechamento', description: `Fechamento (Dif: R$ ${diff.toFixed(2)})`, amount: countedAmount, time: new Date(), user: 'Jacilene' },
                ...prev.movements
            ]
        }));
        setModalType(null);
        
        if (Math.abs(diff) > 0.01) {
            setToast({ message: `Caixa fechado com diferença de R$ ${diff.toFixed(2)}`, type: 'info' });
        } else {
            setToast({ message: 'Caixa fechado corretamente!', type: 'success' });
        }
    };

    const onModalConfirm = (amount: number, desc: string) => {
        if (modalType === 'abrir') handleOpenBox(amount);
        else if (modalType === 'fechar') handleCloseBox(amount);
        else handleMovement(amount, desc);
    };

    // --- Render ---

    return (
        <div className="h-full flex flex-col bg-slate-50 relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Archive className="text-orange-500" />
                        Controle de Caixa
                    </h1>
                    <p className="text-slate-500 text-sm">Gerencie aberturas, fechamentos e sangrias do dia.</p>
                </div>
                
                <div className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm ${session.status === 'aberto' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {session.status === 'aberto' ? <Unlock size={16}/> : <Lock size={16}/>}
                    {session.status === 'aberto' ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
                
                {/* STATE: CLOSED */}
                {session.status === 'fechado' && (
                    <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center space-y-6">
                        <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                            <Lock size={48} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">O caixa está fechado</h2>
                            <p className="text-slate-500 mt-2">Para iniciar as operações de venda em dinheiro, abra o caixa informando o fundo de troco.</p>
                        </div>
                        
                        {session.closingBalance !== undefined && (
                            <div className="bg-white p-6 rounded-xl border border-slate-200 w-full shadow-sm text-left">
                                <h3 className="font-bold text-slate-700 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                                    <History size={18}/> Resumo do Último Turno
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Data Fechamento:</span>
                                        <span className="font-medium text-slate-800">{format(session.date, "dd/MM/yyyy HH:mm")}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Saldo Final (Sistema):</span>
                                        <span className="font-medium text-slate-800">R$ {session.calculatedBalance?.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Valor Conferido:</span>
                                        <span className="font-bold text-slate-800">R$ {session.closingBalance.toFixed(2)}</span>
                                    </div>
                                    <div className={`flex justify-between pt-2 border-t border-slate-100 font-bold ${session.difference && session.difference < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        <span>Diferença (Quebra):</span>
                                        <span>{session.difference && session.difference > 0 ? '+' : ''} R$ {session.difference?.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={() => setModalType('abrir')}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Unlock size={20} />
                            Abrir Caixa
                        </button>
                    </div>
                )}

                {/* STATE: OPEN */}
                {session.status === 'aberto' && (
                    <div className="space-y-6">
                        {/* KPI Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard 
                                title="Saldo em Gaveta" 
                                value={`R$ ${stats.currentBalance.toFixed(2)}`} 
                                icon={DollarSign} 
                                colorClass="bg-blue-500" 
                                textColor="text-blue-600"
                            />
                            <StatCard 
                                title="Fundo de Troco" 
                                value={`R$ ${session.openingBalance.toFixed(2)}`} 
                                icon={Archive} 
                                colorClass="bg-slate-500" 
                                textColor="text-slate-600"
                            />
                            <StatCard 
                                title="Entradas (Dinheiro)" 
                                value={`R$ ${stats.totalIn.toFixed(2)}`} 
                                icon={ArrowUpCircle} 
                                colorClass="bg-green-500" 
                                textColor="text-green-600"
                            />
                            <StatCard 
                                title="Saídas (Sangrias)" 
                                value={`R$ ${stats.totalOut.toFixed(2)}`} 
                                icon={ArrowDownCircle} 
                                colorClass="bg-red-500" 
                                textColor="text-red-600"
                            />
                        </div>

                        {/* Actions & List */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Action Panel */}
                            <div className="space-y-4">
                                <Card title="Operações Rápidas">
                                    <div className="space-y-3">
                                        <button 
                                            onClick={() => setModalType('suprimento')}
                                            className="w-full flex items-center justify-between p-3 rounded-lg border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium"
                                        >
                                            <span className="flex items-center gap-2"><ArrowUpCircle size={18}/> Suprimento</span>
                                            <span className="text-xs bg-white px-2 py-1 rounded border border-blue-100">Entrada</span>
                                        </button>
                                        <button 
                                            onClick={() => setModalType('sangria')}
                                            className="w-full flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50 text-red-700 hover:bg-red-100 transition-colors font-medium"
                                        >
                                            <span className="flex items-center gap-2"><ArrowDownCircle size={18}/> Sangria</span>
                                            <span className="text-xs bg-white px-2 py-1 rounded border border-red-100">Retirada</span>
                                        </button>
                                        <div className="border-t border-slate-100 my-2"></div>
                                        <button 
                                            onClick={() => setModalType('fechar')}
                                            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 shadow-lg shadow-slate-200 transition-all active:scale-95"
                                        >
                                            <CheckCircle size={20}/>
                                            Fechar Caixa
                                        </button>
                                    </div>
                                </Card>

                                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-3">
                                    <AlertTriangle className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <h4 className="text-sm font-bold text-orange-800">Lembrete</h4>
                                        <p className="text-xs text-orange-700 mt-1">
                                            Lembre-se de realizar sangrias ao atingir valores altos em espécie por segurança.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Movements History */}
                            <div className="lg:col-span-2">
                                <Card title="Histórico de Movimentações" className="h-full">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                                <tr>
                                                    <th className="px-4 py-3 rounded-tl-lg">Hora</th>
                                                    <th className="px-4 py-3">Tipo</th>
                                                    <th className="px-4 py-3">Descrição</th>
                                                    <th className="px-4 py-3 text-right rounded-tr-lg">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {session.movements.map((mov) => (
                                                    <tr key={mov.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 text-slate-500">
                                                            {format(mov.time, 'HH:mm')}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                                mov.type === 'abertura' ? 'bg-slate-100 text-slate-600' :
                                                                mov.type === 'suprimento' || mov.type === 'venda' ? 'bg-green-100 text-green-700' :
                                                                mov.type === 'fechamento' ? 'bg-purple-100 text-purple-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                                {mov.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-700 font-medium">
                                                            {mov.description}
                                                        </td>
                                                        <td className={`px-4 py-3 text-right font-bold ${
                                                            mov.type === 'sangria' ? 'text-red-600' : 'text-green-600'
                                                        }`}>
                                                            {mov.type === 'sangria' ? '- ' : '+ '}
                                                            R$ {mov.amount.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {session.movements.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                                            Nenhuma movimentação registrada.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Overlay */}
            {modalType && (
                <OperationModal 
                    type={modalType} 
                    onClose={() => setModalType(null)} 
                    onConfirm={onModalConfirm}
                    currentBalance={stats.currentBalance}
                />
            )}
        </div>
    );
};

export default CaixaView;
