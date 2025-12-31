
import React, { useState, useEffect } from 'react';
import { X, Package, DollarSign, Tag, BarChart, Save, AlertTriangle } from 'lucide-react';
import { Product } from '../../types';
// FIX: Added import for ToggleSwitch component.
import ToggleSwitch from '../shared/ToggleSwitch';

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
        min_stock: 5,
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
                min_stock: product.min_stock || 0,
                cost_price: product.cost_price || 0,
                price: product.price || 0,
                active: product.active ?? true
            });
        } else {
            setFormData({
                name: '',
                sku: '',
                stock_quantity: 0,
                min_stock: 5,
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
            min_stock: Number(formData.min_stock),
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
            <div className="bg-white rounded-[32px] shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b bg-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                            <Package size={20} />
                        </div>
                        <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">
                            {product?.id ? 'Editar Produto' : 'Novo Produto'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button>
                </header>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nome do Produto</label>
                            <input 
                                required
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-4 py-3 focus:ring-4 focus:ring-purple-50 focus:border-purple-400 outline-none font-bold text-slate-700 transition-all"
                                placeholder="Ex: Shampoo Hidratante"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">SKU / Cód.</label>
                            <input 
                                value={formData.sku}
                                onChange={e => setFormData({...formData, sku: e.target.value})}
                                className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-4 py-3 focus:ring-4 focus:ring-purple-50 focus:border-purple-400 outline-none font-bold text-slate-700 transition-all uppercase"
                                placeholder="COD-01"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Preço Custo</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">R$</span>
                                <input 
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.cost_price}
                                    onChange={e => setFormData({...formData, cost_price: Number(e.target.value)})}
                                    className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl pl-10 pr-4 py-3 focus:ring-4 focus:ring-purple-50 focus:border-purple-400 outline-none font-bold text-slate-700"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Preço Venda</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">R$</span>
                                <input 
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.price}
                                    onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                                    className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl pl-10 pr-4 py-3 focus:ring-4 focus:ring-purple-50 focus:border-purple-400 outline-none font-black text-slate-800"
                                />
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-2 flex flex-col justify-center items-center border border-slate-100">
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Margem</span>
                            <span className={`text-sm font-black ${Number(profitMargin) > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {profitMargin}%
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Saldo em Estoque</label>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => setFormData(prev => ({...prev, stock_quantity: Math.max(0, (prev.stock_quantity || 0) - 1)}))} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black transition-all">-</button>
                                    <input 
                                        type="number"
                                        required
                                        value={formData.stock_quantity}
                                        onChange={e => setFormData({...formData, stock_quantity: Number(e.target.value)})}
                                        className="flex-1 border-2 border-slate-100 bg-slate-50 rounded-xl px-2 py-2 text-center focus:border-purple-400 outline-none font-black text-slate-700"
                                    />
                                    <button type="button" onClick={() => setFormData(prev => ({...prev, stock_quantity: (prev.stock_quantity || 0) + 1}))} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black transition-all">+</button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1 flex items-center gap-1.5">
                                    <AlertTriangle size={10} className="text-orange-500" />
                                    Estoque Mínimo (Alerta)
                                </label>
                                <input 
                                    type="number"
                                    required
                                    value={formData.min_stock}
                                    onChange={e => setFormData({...formData, min_stock: Number(e.target.value)})}
                                    className="w-full border-2 border-orange-50 bg-orange-50/20 rounded-xl px-4 py-2 focus:ring-4 focus:ring-orange-50 focus:border-orange-200 outline-none font-bold text-orange-600"
                                    placeholder="Ex: 5"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col justify-end gap-3 pb-2">
                            <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                <ToggleSwitch 
                                    on={!!formData.active} 
                                    onClick={() => setFormData({...formData, active: !formData.active})} 
                                />
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">Ativo para Venda</label>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-4 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-500 font-black uppercase tracking-widest text-xs hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                        <button type="submit" className="flex-[2] py-4 bg-slate-800 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-900 shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95">
                            <Save size={18} /> Salvar Produto
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductModal;
