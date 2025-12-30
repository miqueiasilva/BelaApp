
import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, CheckCircle, AlertTriangle, Loader2, Database, Table, Check, Info, ArrowRight } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

interface ImportClientsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ImportClientsModal: React.FC<ImportClientsModalProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'ready' | 'importing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LÓGICA DE SANITIZAÇÃO E LIMPEZA ---
  const sanitizeAndValidate = useCallback((rawJson: any[]) => {
    return rawJson
      .map(row => {
        // Mapeia colunas comuns (independente de maiúsculas/minúsculas)
        const getVal = (hints: string[]) => {
          const key = Object.keys(row).find(k => hints.includes(k.toLowerCase().trim()));
          return key ? row[key] : '';
        };

        const nome = (getVal(['nome', 'cliente', 'full name']) || '').toString().trim();
        const apelido = (getVal(['apelido', 'nickname', 'nome social']) || '').toString().trim();
        const email = (getVal(['email', 'e-mail']) || '').toString().trim();
        
        // Regra de Ouro: Limpeza de Telefone
        const rawPhone = (getVal(['telefone 1', 'telefone', 'whatsapp', 'phone 1', 'celular']) || '').toString();
        const cleanedPhone = rawPhone.replace(/\D/g, ''); // Remove tudo que não é número

        return {
          nome: nome || 'Sem Nome',
          apelido,
          email,
          whatsapp: cleanedPhone,
          user_id: user?.id,
          consent: true,
          origem: 'Importação CSV'
        };
      })
      // Regra 3: Pula se o telefone estiver vazio ou for inválido (< 8 dígitos)
      .filter(c => c.whatsapp.length >= 8);
  }, [user]);

  // --- PROCESSAMENTO DO ARQUIVO ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('parsing');
    const reader = new FileReader();

    reader.onload = (event) => {
        const csvString = event.target?.result as string;
        
        // Regra 1: Ignora as 3 primeiras linhas (Lixo/Metadados)
        const lines = csvString.split(/\r?\n/);
        const usefulCsv = lines.slice(3).join('\n'); // Mantém da linha 4 em diante

        Papa.parse(usefulCsv, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            // Detecção automática de delimitador (, ou ;)
            complete: (results) => {
                const sanitized = sanitizeAndValidate(results.data);
                if (sanitized.length === 0) {
                    setStatus('error');
                    setErrorMsg("Nenhum cliente válido encontrado após a linha 4. Verifique os cabeçalhos.");
                } else {
                    setParsedData(sanitized);
                    setProgress({ current: 0, total: sanitized.length, percentage: 0 });
                    setStatus('ready');
                }
            },
            error: (err) => {
                setStatus('error');
                setErrorMsg("Erro ao ler CSV: " + err.message);
            }
        });
    };

    reader.readAsText(file, 'ISO-8859-1'); // Comum em CSVs brasileiros vindos do Excel
  };

  // --- IMPORTAÇÃO EM LOTES (ANTI-TRAVAMENTO) ---
  const startImport = async () => {
    if (!user) return;
    setStatus('importing');
    
    const BATCH_SIZE = 50; // Lotes de 50 para máxima estabilidade
    const total = parsedData.length;
    let processedCount = 0;

    for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = parsedData.slice(i, i + BATCH_SIZE);
        
        try {
            const { error } = await supabase
                .from('clients')
                .upsert(batch, { onConflict: 'whatsapp' });

            if (error) throw error;

            processedCount += batch.length;
            const percentage = Math.round((processedCount / total) * 100);
            
            setProgress({ 
                current: processedCount, 
                total, 
                percentage 
            });

            // "Event Loop Yielding": Pequeno delay para a UI respirar e não travar
            await new Promise(resolve => setTimeout(resolve, 30));

        } catch (err: any) {
            console.error("Erro no lote:", err);
            setStatus('error');
            setErrorMsg(`Erro ao importar lote ${i}: ` + err.message);
            return;
        }
    }

    setStatus('done');
    setTimeout(() => {
        onSuccess();
        onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <Database className="text-orange-500" size={24} />
              Importação em Lote
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Otimizado para 2.000+ registros</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </header>

        <div className="p-8">
          {status === 'idle' && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-4 border-dashed border-slate-100 rounded-[40px] p-16 flex flex-col items-center justify-center cursor-pointer hover:border-orange-200 hover:bg-orange-50/30 transition-all group"
            >
              <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-orange-100">
                <Upload size={40} strokeWidth={3} />
              </div>
              <h3 className="text-lg font-black text-slate-700">Selecionar Lista de Clientes</h3>
              <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-tighter text-center">
                Ignoraremos as 3 primeiras linhas lixo.<br/>A 4ª linha deve conter os cabeçalhos.
              </p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
            </div>
          )}

          {(status === 'parsing' || status === 'importing') && (
            <div className="py-12 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <Loader2 className="animate-spin text-orange-500" size={56} strokeWidth={3} />
                <Database className="absolute inset-0 m-auto text-orange-200" size={20} />
              </div>
              <div className="text-center w-full max-w-xs">
                <h3 className="text-lg font-black text-slate-800">
                  {status === 'parsing' ? 'Higienizando dados...' : 'Enviando para Nuvem...'}
                </h3>
                <div className="mt-4 w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                    <div 
                        className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-300" 
                        style={{ width: `${progress.percentage}%` }}
                    />
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-3">
                  Importando {progress.current} de {progress.total}
                </p>
              </div>
            </div>
          )}

          {status === 'ready' && (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex items-center gap-5">
                <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-lg shadow-emerald-100">
                  <Table size={24} />
                </div>
                <div>
                  <p className="text-lg font-black text-emerald-900 leading-none">{progress.total} clientes prontos</p>
                  <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mt-1">Limpeza e filtragem concluídas.</p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setStatus('idle')}
                  className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Trocar Arquivo
                </button>
                <button 
                  onClick={startImport}
                  className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-orange-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Iniciar Importação <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {status === 'done' && (
            <div className="py-12 text-center animate-in fade-in zoom-in-95">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-50">
                <Check size={48} strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-slate-800">Sucesso Absoluto!</h3>
              <p className="text-slate-500 font-medium mt-2">Toda a sua lista foi sincronizada com o BelaFlow.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6 animate-in shake duration-300">
              <div className="bg-rose-50 border border-rose-100 rounded-[32px] p-8 text-center">
                <AlertTriangle size={48} className="text-rose-500 mx-auto mb-4" />
                <h3 className="text-lg font-black text-rose-900">Falha no Processamento</h3>
                <p className="text-sm text-rose-700 mt-2 leading-relaxed">{errorMsg}</p>
              </div>
              <button 
                onClick={() => setStatus('idle')}
                className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black hover:bg-slate-900 transition-all"
              >
                Tentar Outro Arquivo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportClientsModal;
