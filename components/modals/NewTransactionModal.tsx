
import React, { useState } from 'react';
import { X, DollarSign, Calendar, Tag } from 'lucide-react';
import { FinancialTransaction, TransactionType, TransactionCategory, PaymentMethod } from '../../types';

interface NewTransactionModalProps {
  onClose: () => void;
  onSave: (transaction: FinancialTransaction) => void;
  type: TransactionType;
}

const NewTransactionModal: React.FC<NewTransactionModalProps> = ({ onClose, onSave, type }) => {
  const [formData, setFormData] = useState<Partial<FinancialTransaction>>({
    type: type,
    date: new Date(),
    status: 'pago',
    paymentMethod: 'pix'
  });

  const categories: { value: TransactionCategory, label: string }[] = [
      { value: 'servico', label: 'Serviço' },
      { value: 'produto', label: 'Venda de Produto' },
      { value: 'comissao', label: 'Pagamento de Comissão' },
      { value: 'aluguel', label: 'Aluguel' },
      { value: 'insumos', label: 'Compra de Insumos' },
      { value: 'marketing', label: 'Marketing / Anúncios' },
      { value: 'taxas', label: 'Contas e Taxas' },
      { value: 'outros', label: 'Outros' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.description || !formData.amount || !formData.category) {
          alert('Preencha os campos obrigatórios');
          return;
      }
      
      const newTransaction: FinancialTransaction = {
          id: Date.now(),
          description: formData.description!,
          amount: Number(formData.amount),
          type: formData.type!,
          category: formData.category as TransactionCategory,
          date: new Date(formData.date || new Date()),
          paymentMethod: formData.paymentMethod as PaymentMethod,
          status: 'pago' // Default for MVP
      };
      
      onSave(newTransaction);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <header className={`p-4 flex justify-between items-center ${type === 'receita' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                <h3 className="text-lg font-bold flex items-center gap-2">
                    {type === 'receita' ? <DollarSign className="w-5 h-5"/> : <Tag className="w-5 h-5"/>}
                    Nova {type === 'receita' ? 'Receita' : 'Despesa'}
                </h3>
                <button onClick={onClose} className="text-white/80 hover:text-white"><X/></button>
            </header>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                    <input 
                        name="description" 
                        type="text" 
                        placeholder="Ex: Venda de Shampoo, Conta de Luz..." 
                        className="w-full border-b border-slate-200 py-2 focus:outline-none focus:border-slate-500 font-medium"
                        onChange={handleChange}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                        <input 
                            name="amount" 
                            type="number" 
                            step="0.01"
                            placeholder="0,00" 
                            className="w-full border-b border-slate-200 py-2 focus:outline-none focus:border-slate-500 font-bold text-lg text-slate-800"
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                        <div className="flex items-center gap-2 border-b border-slate-200 py-2">
                            <Calendar className="w-4 h-4 text-slate-400"/>
                            <input 
                                name="date" 
                                type="date" 
                                className="w-full focus:outline-none bg-transparent"
                                onChange={e => setFormData({...formData, date: new Date(e.target.value)})}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
                        <select 
                            name="category" 
                            className="w-full border-b border-slate-200 py-2 focus:outline-none bg-transparent"
                            onChange={handleChange}
                        >
                            <option value="">Selecione</option>
                            {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pagamento</label>
                        <select 
                            name="paymentMethod" 
                            className="w-full border-b border-slate-200 py-2 focus:outline-none bg-transparent"
                            onChange={handleChange}
                            value={formData.paymentMethod}
                        >
                            <option value="pix">Pix</option>
                            <option value="cartao_credito">Crédito</option>
                            <option value="cartao_debito">Débito</option>
                            <option value="dinheiro">Dinheiro</option>
                        </select>
                    </div>
                </div>

                <button 
                    type="submit" 
                    className={`w-full py-3 rounded-xl font-bold text-white shadow-lg mt-4 transition-transform active:scale-95 ${type === 'receita' ? 'bg-green-500 hover:bg-green-600 shadow-green-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'}`}
                >
                    Confirmar Lançamento
                </button>
            </form>
        </div>
    </div>
  );
};

export default NewTransactionModal;
