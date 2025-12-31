
import React, { useState, useEffect } from 'react';
import { X, Package, DollarSign, Tag, BarChart, Save } from 'lucide-react';
import { Product } from '../../types';

interface ProductModalProps {
    product?: Product | null;
    onClose: () => void;
    onSave: (product: Product) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Product>>({
        name: '',
        sku: '',
        stock_quantity: 0,
        cost_price: 0,
        price: 0,
        active: true
    });

    useEffect(() => {
        if (product) {
            setFormData({
                ...product,
                name: product.name || '',
                sku: product.sku || '',
                stock_quantity: product.stock_quantity || 0,
                cost_price: product.cost_price || 0,
                price: product.price || 0,
                active: product.active ?? true
            });
        } else {
            setFormData({
                name: '',
                sku: '',
                stock_quantity: 0,
                cost_price: 0,
                price: 0,
                active: true
            });
        }
    }, [product]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: product?.id || Date.now(),
            name: formData.name || 'Novo Produto',
            sku: formData.sku,
            stock_quantity: Number(formData.stock_quantity),
            cost_price: Number(formData.cost_price),
            price: Number(formData.price),
            active: formData.active ?? true
        } as Product);
    };

    const profitMargin = formData.price && formData.cost_price 
        ? (((formData.price - formData.cost_price) / formData.price) * 100).toFixed(1) 
        : '0.0';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                        <Package className="w-5 h-5 text-purple-500" />
                        {product?.id ? 'Editar Produto' : 'Novo Produto'}
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </header>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Produto</label>
                            <input 
                                required
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="Ex: Shampoo Hidratante"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SKU / Código</label>
                            <input 
                                value={formData.sku}
                                onChange={e => setFormData({...formData, sku: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none uppercase"
                                placeholder="COD-01"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preço de Custo</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                                <input 
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.cost_price}
                                    onChange={e => setFormData({...formData, cost_price: Number(e.target.value)})}
                                    className="w-full border border-slate-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preço de Venda</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                                <input 
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.price}
                                    onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                                    className="w-full border border-slate-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none font-bold text-slate-700"
                                />
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2 flex flex-col justify-center items-center border border-slate-200">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Margem</span>
                            <span className={`text-sm font-bold ${Number(profitMargin) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {profitMargin}%
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estoque Atual</label>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setFormData(prev => ({...prev, stock_quantity: Math.max(0, (prev.stock_quantity || 0) - 1)}))} className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">-</button>
                                <input 
                                    type="number"
                                    required
                                    value={formData.stock_quantity}
                                    onChange={e => setFormData({...formData, stock_quantity: Number(e.target.value)})}
                                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-center focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                                <button type="button" onClick={() => setFormData(prev => ({...prev, stock_quantity: (prev.stock_quantity || 0) + 1}))} className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">+</button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 pt-6">
                            <input 
                                type="checkbox" 
                                id="active"
                                checked={formData.active}
                                onChange={e => setFormData({...formData, active: e.target.checked})}
                                className="w-5 h-5 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                            />
                            <label htmlFor="active" className="text-sm font-medium text-slate-700">Produto Ativo para Venda</label>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg transition">Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 flex items-center gap-2 transition active:scale-95">
                            <Save size={18} /> Salvar Produto
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductModal;
