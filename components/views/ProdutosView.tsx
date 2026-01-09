
import React, { useState, useMemo, useEffect } from 'react';
import { 
    Package, Search, Plus, Filter, Edit2, Trash2, 
    AlertTriangle, TrendingUp, Archive, LayoutGrid, List,
    Loader2, History, Save, X, RefreshCw,
    ShoppingBag, ChevronRight, MoreVertical
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useStudio } from '../../contexts/StudioContext';
import ProductModal from '../modals/ProductModal';
import Toast, { ToastType } from '../shared/Toast';
import { Product } from '../../types';

const ProdutosView: React.FC = () => {
    const { activeStudioId } = useStudio();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const fetchProducts = async () => {
        if (!activeStudioId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('studio_id', activeStudioId)
                .order('name');
            if (error) throw error;
            setProducts(data || []);
        } catch (e: any) {
            setToast({ message: "Erro ao sincronizar estoque.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProducts(); }, [activeStudioId]);

    const handleSaveProduct = async (productData: Product) => {
        if (!activeStudioId) return;
        try {
            const payload = { ...productData, studio_id: activeStudioId };
            const isEdit = !!productData.id && products.some(p => p.id === productData.id);
            const { error } = isEdit 
                ? await supabase.from('products').update(payload).eq('id', productData.id)
                : await supabase.from('products').insert([payload]);
            if (error) throw error;
            setToast({ message: isEdit ? 'Produto atualizado!' : 'Produto cadastrado!', type: 'success' });
            setIsModalOpen(false);
            fetchProducts();
        } catch (e: any) { setToast({ message: e.message, type: 'error' }); }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Deseja realmente excluir este produto?")) {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (!error) { fetchProducts(); setToast({ message: "Produto removido.", type: 'info' }); }
        }
    };

    const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="h-full flex flex-col bg-slate-50 font-sans text-left overflow-hidden">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="text-xl font-black text-slate-800 flex items-center gap-2"><Package className="text-purple-500" /> Estoque</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Gerenciamento de Produtos - Unidade Ativa</p>
                </div>
                <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-lg active:scale-95">NOVO PRODUTO</button>
            </header>
            <div className="p-4 bg-white border-b border-slate-100">
                <input type="text" placeholder="Buscar por nome ou SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-md px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
            </div>
            <main className="flex-1 overflow-y-auto p-6">
                {loading ? <div className="flex justify-center p-20"><Loader2 className="animate-spin text-purple-500" /></div> : (
                    <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase"><tr className="border-b border-slate-100"><th className="p-6">Produto</th><th className="p-6 text-center">Saldo</th><th className="p-6 text-right">Preço</th><th className="p-6 text-right">Ações</th></tr></thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50">
                                        <td className="p-6 font-bold text-slate-700">{p.name}</td>
                                        <td className="p-6 text-center"><span className={`px-4 py-1.5 rounded-full font-black text-xs ${p.stock_quantity <= (p.min_stock || 0) ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{p.stock_quantity} un</span></td>
                                        <td className="p-6 text-right font-black text-slate-800">R$ {Number(p.price).toFixed(2)}</td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-purple-600"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-300 hover:text-rose-600"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
            {isModalOpen && <ProductModal product={editingProduct} onClose={() => setIsModalOpen(false)} onSave={handleSaveProduct} />}
        </div>
    );
};

export default ProdutosView;
