
import React, { useState, useMemo, useRef } from 'react';
import { 
    Search, Plus, Filter, Edit2, Trash2, Tag, Clock, 
    DollarSign, Scissors, MoreVertical, LayoutGrid, List, Upload, FileUp
} from 'lucide-react';
import { services as initialServicesMap } from '../../data/mockData';
import { LegacyService } from '../../types';
import { ServiceModal } from '../modals/ConfigModals';
import Toast, { ToastType } from '../shared/Toast';

const ServicosView: React.FC = () => {
    // Convert mock object to array
    const [services, setServices] = useState<LegacyService[]>(Object.values(initialServicesMap));
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todas');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<LegacyService | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // CSV Import Ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Derived State ---

    const categories = useMemo(() => {
        const cats = new Set(services.map(s => s.category || 'Geral'));
        return ['Todas', ...Array.from(cats).sort()];
    }, [services]);

    const filteredServices = useMemo(() => {
        return services.filter(service => {
            const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'Todas' || (service.category || 'Geral') === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [services, searchTerm, selectedCategory]);

    const servicesByCategory = useMemo(() => {
        const grouped: { [key: string]: LegacyService[] } = {};
        filteredServices.forEach(s => {
            const cat = s.category || 'Geral';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(s);
        });
        return grouped;
    }, [filteredServices]);

    // --- Handlers ---

    const showToast = (message: string, type: ToastType = 'success') => setToast({ message, type });

    const handleSaveService = (service: LegacyService) => {
        setServices(prev => {
            const exists = prev.find(s => s.id === service.id);
            if (exists) {
                return prev.map(s => s.id === service.id ? service : s);
            }
            return [...prev, service];
        });
        setIsModalOpen(false);
        setEditingService(null);
        showToast(editingService ? 'Serviço atualizado com sucesso!' : 'Novo serviço criado!');
    };

    const handleDeleteService = (id: number) => {
        if (window.confirm('Tem certeza que deseja excluir este serviço?')) {
            setServices(prev => prev.filter(s => s.id !== id));
            showToast('Serviço removido.', 'info');
        }
    };

    const handleEditClick = (service: LegacyService) => {
        setEditingService(service);
        setIsModalOpen(true);
    };

    const handleNewClick = () => {
        setEditingService(null);
        setIsModalOpen(true);
    };

    const formatDuration = (min: number) => {
        const h = Math.floor(min / 60);
        const m = min % 60;
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}min`;
    };

    // --- CSV Import Logic ---

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            try {
                const lines = text.split('\n');
                const newServices: LegacyService[] = [];
                let successCount = 0;

                // Determine if first row is header based on common keywords
                const firstLine = lines[0].toLowerCase();
                const startIndex = (firstLine.includes('nome') || firstLine.includes('name') || firstLine.includes('servico')) ? 1 : 0;

                for (let i = startIndex; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    // Simple split by comma (doesn't handle commas inside quotes for simplicity)
                    const cols = line.split(',').map(c => c.trim());
                    
                    // Expected Format: Name, Price, Duration, Category
                    if (cols.length >= 2) {
                        const name = cols[0].replace(/^"|"$/g, ''); 
                        const price = parseFloat(cols[1]);
                        const duration = parseInt(cols[2]) || 30; // Default 30 min
                        const category = cols[3]?.replace(/^"|"$/g, '') || 'Geral';

                        if (name && !isNaN(price)) {
                            newServices.push({
                                id: Date.now() + i, // Generate quasi-unique ID
                                name,
                                price,
                                duration,
                                category,
                                color: '#3b82f6' // Default Blue
                            });
                            successCount++;
                        }
                    }
                }

                if (successCount > 0) {
                    setServices(prev => [...prev, ...newServices]);
                    showToast(`${successCount} serviços importados com sucesso!`, 'success');
                } else {
                    showToast('Nenhum dado válido encontrado. Verifique o formato (Nome, Preço, Duração, Categoria).', 'error');
                }

            } catch (err) {
                console.error("CSV Import Error", err);
                showToast('Erro ao processar o arquivo. Verifique o formato.', 'error');
            }

            // Reset input to allow re-uploading same file if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Hidden Input for CSV */}
            <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload}
            />

            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Scissors className="text-orange-500" />
                        Catálogo de Serviços
                    </h1>
                    <p className="text-slate-500 text-sm">Gerencie os procedimentos oferecidos no estúdio.</p>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <button 
                        onClick={handleImportClick}
                        className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 w-full md:w-auto"
                        title="Importar CSV (Nome, Preço, Duração, Categoria)"
                    >
                        <FileUp size={20} className="text-slate-500" />
                        <span className="hidden sm:inline">Importar CSV</span>
                    </button>

                    <button 
                        onClick={handleNewClick}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-200 transition-all active:scale-95 w-full md:w-auto"
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline">Novo Serviço</span>
                        <span className="sm:hidden">Novo</span>
                    </button>
                </div>
            </header>

            {/* Filters Bar */}
            <div className="px-6 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                                selectedCategory === cat 
                                ? 'bg-slate-800 text-white border-slate-800' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Buscar serviço..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                        />
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
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 pt-0">
                {Object.keys(servicesByCategory).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <Scissors size={48} className="mb-4 opacity-20" />
                        <p>Nenhum serviço encontrado.</p>
                        <div className="flex gap-4 mt-4">
                            <button onClick={handleImportClick} className="text-blue-500 font-bold hover:underline flex items-center gap-1">
                                <Upload size={16}/> Importar CSV
                            </button>
                            <span className="text-slate-300">|</span>
                            <button onClick={handleNewClick} className="text-orange-500 font-bold hover:underline">
                                Criar Manualmente
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(servicesByCategory).map(([category, items]: [string, LegacyService[]]) => (
                            <div key={category}>
                                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                    <Tag size={14} /> {category}
                                    <span className="text-xs font-normal bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">{items.length}</span>
                                </h3>
                                
                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {items.map(service => (
                                            <div key={service.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: service.color }}></div>
                                                
                                                <div className="flex justify-between items-start mb-2 pl-2">
                                                    <h4 className="font-bold text-slate-800 text-lg leading-tight">{service.name}</h4>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEditClick(service)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDeleteService(service.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 text-sm text-slate-600 pl-2 mt-4">
                                                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg">
                                                        <Clock size={14} className="text-slate-400" />
                                                        <span>{formatDuration(service.duration)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-lg text-green-700 font-bold border border-green-100">
                                                        <DollarSign size={14} />
                                                        <span>{service.price.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                        {items.map((service, idx) => (
                                            <div key={service.id} className={`flex items-center justify-between p-4 hover:bg-slate-50 transition-colors ${idx !== items.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }}></div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800">{service.name}</h4>
                                                        <p className="text-xs text-slate-500">{formatDuration(service.duration)} • R$ {service.price.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleEditClick(service)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button onClick={() => handleDeleteService(service.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <ServiceModal
                    service={editingService}
                    availableCategories={categories.filter(c => c !== 'Todas')}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveService}
                />
            )}
        </div>
    );
};

export default ServicosView;
