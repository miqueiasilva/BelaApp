import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  UserPlus, Search, Phone, Edit, 
  Trash2, FileUp, MoreVertical, Cake, Users, History, Loader2, RefreshCw, AlertCircle
} from 'lucide-react';
import { Client } from '../../types';
import ClientModal from '../modals/ClientModal';
import Toast, { ToastType } from '../shared/Toast';
import { supabase } from '../../services/supabaseClient';

const ClientesView: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('nome', { ascending: true });
        
        if (error) throw error;
        setClients(data || []);
    } catch (e: any) {
        console.error("Erro ao carregar clientes do banco:", e);
        showToast("Falha ao sincronizar com o servidor", 'error');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const showToast = (message: string, type: ToastType = 'success') => setToast({ message, type });

  /**
   * FUNÇÃO REFATORADA: handleSaveClient
   * Objetivo: Garantir persistência real antes do feedback visual.
   */
  const handleSaveClient = async (clientData: Client) => {
    const isUpdate = !!clientData.id;
    
    // 1. Limpeza de Payload: Garantimos que campos nulos não quebrem o DB
    const payload = {
        nome: clientData.nome,
        whatsapp: clientData.whatsapp || null,
        email: clientData.email || null,
        nascimento: clientData.nascimento || null,
        instagram: (clientData as any).instagram || null,
        origem: (clientData as any).origem || 'link',
        consent: true
    };

    try {
        // 2. Operação Assíncrona com Await
        // .select() é crucial para retornar o objeto atualizado do banco
        const { data: savedRow, error } = await supabase
            .from('clients')
            .upsert(isUpdate ? { id: clientData.id, ...payload } : payload)
            .select() 
            .single();

        // 3. Validação Rigorosa da Resposta
        if (error) {
            // Se houver erro de rede ou de constraint do banco, cai aqui
            throw new Error(`DB Error: ${error.message}`);
        }

        if (!savedRow) {
            throw new Error("O servidor não retornou os dados salvos.");
        }

        // 4. Sincronização de Estado (Evita Stale Data)
        // Em vez de dar F5, atualizamos o array local com o dado real vindo do DB
        setClients(prev => {
            if (isUpdate) {
                return prev.map(c => c.id === savedRow.id ? savedRow : c);
            } else {
                return [savedRow, ...prev];
            }
        });

        // 5. Sucesso real confirmado
        showToast(isUpdate ? 'Perfil atualizado!' : 'Cliente cadastrado!');
        setIsModalOpen(false);
        setSelectedClient(null);

    } catch (e: any) {
        // 6. Tratamento de Erros Silenciosos
        console.error("CRITICAL ERROR NO SALVAMENTO:", {
            error: e,
            payload: payload,
            timestamp: new Date().toISOString()
        });

        showToast(
            e.message.includes("violates check constraint") 
            ? "Dados inválidos. Verifique os campos." 
            : "Erro de conexão. Os dados NÃO foram salvos.", 
            'error'
        );
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const filteredClients = clients.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.whatsapp?.includes(searchTerm)
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-orange-500" /> Gestão de Clientes
        </h1>
        <button 
          onClick={() => { setSelectedClient(null); setIsModalOpen(true); }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-100"
        >
          <UserPlus size={18} /> Novo Cliente
        </button>
      </header>

      <div className="p-4 border-b bg-white">
        <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
                type="text" 
                placeholder="Buscar por nome ou celular..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-100 outline-none"
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Loader2 className="animate-spin mb-2" />
                <p className="text-sm">Carregando base de clientes...</p>
            </div>
        ) : (
            <div className="divide-y divide-slate-100">
                {filteredClients.map(client => (
                    <div key={client.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                                {client.nome.charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">{client.nome}</h4>
                                <p className="text-xs text-slate-500">{client.whatsapp || 'Sem celular'}</p>
                            </div>
                        </div>
                        <button onClick={() => handleEdit(client)} className="p-2 text-slate-400 hover:text-orange-500 transition-colors">
                            <Edit size={18} />
                        </button>
                    </div>
                ))}
            </div>
        )}
      </div>

      {isModalOpen && (
        <ClientModal 
          client={selectedClient} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSaveClient} 
        />
      )}
    </div>
  );
};

export default ClientesView;