import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, Calendar, Tag, Plus, Save, Loader2 } from 'lucide-react';
import { Client } from '../../types';

interface ClientModalProps {
  client?: Client | null;
  onClose: () => void;
  onSave: (client: Client) => void;
}

const ClientModal: React.FC<ClientModalProps> = ({ client, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Client>>({
    nome: '',
    whatsapp: '',
    email: '',
    nascimento: '',
    tags: [],
    consent: true
  });
  
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData(client);
    } else {
      // Reset for new client
      setFormData({
        nome: '',
        whatsapp: '',
        email: '',
        nascimento: '',
        tags: [],
        consent: true
      });
    }
  }, [client]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tag) }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) return;

    setIsSaving(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));

    const savedClient: Client = {
      id: client?.id || Date.now(),
      nome: formData.nome || '',
      whatsapp: formData.whatsapp,
      email: formData.email,
      nascimento: formData.nascimento,
      tags: formData.tags || [],
      consent: formData.consent || false
    };

    onSave(savedClient);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <header className="p-5 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-orange-500" />
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 p-1 transition">
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-orange-200 focus-within:border-orange-400 transition-all">
                <User className="w-5 h-5 text-slate-400" />
                <input 
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Ex: Maria Silva"
                  className="w-full bg-transparent outline-none text-slate-800 font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp</label>
                <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-green-200 focus-within:border-green-400 transition-all">
                  <Phone className="w-5 h-5 text-slate-400" />
                  <input 
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-transparent outline-none text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nascimento</label>
                <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-orange-200 focus-within:border-orange-400 transition-all">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <input 
                    type="date"
                    name="nascimento"
                    value={formData.nascimento}
                    onChange={handleChange}
                    className="w-full bg-transparent outline-none text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label>
              <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-400 transition-all">
                <Mail className="w-5 h-5 text-slate-400" />
                <input 
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="cliente@email.com"
                  className="w-full bg-transparent outline-none text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tags / Etiquetas</label>
              <div className="bg-white border border-slate-300 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-orange-200 focus-within:border-orange-400 transition-all">
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags?.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1.5 text-orange-600 hover:text-orange-900">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-slate-400" />
                  <input 
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Adicionar tag (enter)"
                    className="w-full bg-transparent outline-none text-sm"
                  />
                  {tagInput && (
                    <button type="button" onClick={handleAddTag} className="text-orange-500 hover:text-orange-700">
                      <Plus size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSaving || !formData.nome}
              className="px-6 py-2.5 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 transition"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {client ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientModal;