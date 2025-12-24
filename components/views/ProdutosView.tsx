
import React, { useState, useMemo } from 'react';
import { 
    Package, Search, Plus, Filter, Edit2, Trash2, 
    AlertTriangle, TrendingUp, DollarSign, Archive, LayoutGrid, List
} from 'lucide-react';
import { mockProducts } from '../../data/mockData';
import { Product } from '../../types';
import ProductModal from '../modals/ProductModal';
import Toast, { ToastType } from '../shared/Toast';
import Card from '../shared/Card';

const ProdutosView: React.FC = () => {
    const [products, setProducts] = useState<Product[]>(mockProducts);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [filterStatus, setFilterStatus] = useState<'todos' | 'baixo_estoque' | 'ativos'>('todos');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // --- Derived Metrics ---
    const stats = useMemo(() => {
        const totalItems = products.length;
        const lowStock = products.filter(p => p.qtd < 5).length;
        const totalValue = products.reduce((acc, p) => acc + (p.custo || 0) * p.qtd, 0);
        const totalSalesValue = products.reduce((acc, p) => acc + p.preco * p.qtd, 0); // Potential Revenue

        return { totalItems, lowStock, totalValue, totalSalesValue };
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (filterStatus === 'baixo_estoque') return matchesSearch && p.qtd < 5;
            if (filterStatus === 'ativos') return matchesSearch && p.ativo;
            return matchesSearch;
        });
    }, [products, searchTerm, filterStatus]);

    // --- Handlers ---

    const showToast = (message: string, type: ToastType = 'success') => setToast({ message, type });

    const handleSaveProduct = (product: Product) => {
        setProducts(prev => {
            const exists = prev.find(p => p.id === product.id);
            if (exists) {
                return prev.map(p => p.id === product.id ? product : p);
            }
            return [...prev, product];
        });
        setIsModalOpen(false);
        setEditingProduct(null);
        showToast(editingProduct ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!');
    };

    const handleDeleteProduct = (id: number) => {
        if (window.confirm('Tem certeza que deseja excluir este produto?')) {
            setProducts(prev => prev.filter(p => p.id !== id));
            showToast('Produto removido.', 'info');
        }
    };

    const handleEditClick = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleNewClick = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Package className="text-purple-500" />
                        Gestão de Estoque
                    </h1>
                    <p className="text-slate-500 text-sm">Controle seus produtos, custos e margens de lucro.</p>
                </div>
                
                <button 
                    onClick={handleNewClick}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-200 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    Novo Produto
                </button>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Valor em Estoque (Custo)</p>
                            <p className="text-2xl font-bold text-slate-800 mt-1">R$ {stats.totalValue.toFixed(2)}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                            <DollarSign className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Produtos Cadastrados</p>
                            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalItems}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                            <Archive className="w-6 h-6" />
                        </div>
                    </div>
                    <div className={`p-5 rounded-xl border shadow-sm flex items-center justify-between ${stats.lowStock > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wider ${stats.lowStock > 0 ? 'text-orange-600' : 'text-slate-400'}`}>Alertas de Estoque</p>
                            <p className={`text-2xl font-bold mt-1 ${stats.lowStock > 0 ? 'text-orange-700' : 'text-slate-800'}`}>{stats.lowStock} itens baixos</p>
                        </div>
                        <div className={`p-3 rounded-full ${stats.lowStock > 0 ? 'bg-orange-200 text-orange-700' : 'bg-green-100 text-green-600'}`}>
                            {stats.lowStock > 0 ? <AlertTriangle className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
                        </div>
                    </div>
                </div>

                {/* Filters & Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input 
                                type="text" 
                                placeholder="Buscar por nome ou SKU..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                            />
                        </div>
                        <div className="relative">
                            <select 
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                                className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer"
                            >
                                <option value="todos">Todos</option>
                                <option value="ativos">Apenas Ativos</option>
                                <option value="baixo_estoque">Estoque Baixo</option>
                            </select>
                            <Filter className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-lg p-1 flex">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>

                {/* List Content */}
                <Card className="p-0 overflow-hidden">
                    {filteredProducts.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <Package size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Nenhum produto encontrado.</p>
                        </div>
                    ) : (
                        viewMode === 'list' ? (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4">Produto</th>
                                        <th className="px-6 py-4">SKU</th>
                                        <th className="px-6 py-4 text-center">Estoque</th>
                                        <th className="px-6 py-4 text-right">Custo</th>
                                        <th className="px-6 py-4 text-right">Preço Venda</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredProducts.map(product => (
                                        <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-slate-800">{product.nome}</td>
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{product.sku || '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                    product.qtd === 0 ? 'bg-red-100 text-red-700' :
                                                    product.qtd < 5 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                    {product.qtd} un
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-500">R$ {product.custo?.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-700">R$ {product.preco.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`w-2 h-2 rounded-full inline-block ${product.ativo ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEditClick(product)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteProduct(product.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                                {filteredProducts.map(product => (
                                    <div key={product.id} className="border border-slate-200 rounded-xl p-4 hover:border-purple-200 hover:shadow-md transition-all relative group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${product.qtd < 5 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                                                Estoque: {product.qtd}
                                            </div>
                                            <span className={`w-2 h-2 rounded-full ${product.ativo ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                        </div>
                                        <h3 className="font-bold text-slate-800 mb-1">{product.nome}</h3>
                                        <p className="text-xs text-slate-400 mb-3 font-mono">{product.sku}</p>
                                        
                                        <div className="flex justify-between items-end border-t border-slate-100 pt-3">
                                            <div>
                                                <p className="text-[10px] text-slate-400">Venda</p>
                                                <p className="font-bold text-purple-600">R$ {product.preco.toFixed(2)}</p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditClick(product)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </Card>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <ProductModal 
                    product={editingProduct}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveProduct}
                />
            )}
        </div>
    );
};

export default ProdutosView;
