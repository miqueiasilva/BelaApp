
import React, { useState, useRef } from 'react';
import { X, Upload, Database, Table, Check, AlertTriangle, Loader2, FileText, ArrowRight } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

interface ImportClientsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ImportClientsModal: React.FC<ImportClientsModalProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'parsing' | 'ready' | 'importing' | 'done' | 'error'>('idle');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0, debugText: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. VALIDAÇÃO E LEITURA
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // CHECKPOINT 1: Início da leitura
    alert("DEBUG: Iniciando leitura física do arquivo...");
    setStatus('parsing');
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      encoding: "ISO-8859-1",
      complete: (results) => {
        // MAPEAMENTO DOS DADOS
        const mapped = results.data.map((row: any) => {
           const nome = row['Nome'] || row['nome'];
           const rawTel = row['Telefone 1'] || row['telefone 1'] || row['whatsapp'];
           const cleanedTel = rawTel ? rawTel.toString().replace(/\D/g, '') : '';

           return {
             nome: nome?.toString().trim(),
             whatsapp: cleanedTel,
             user_id: user?.id,
             consent: true,
             origem: 'Importação Debug'
           };
        }).filter(item => item.nome && item.whatsapp.length >= 8);

        // CHECKPOINT 2: Pós-Leitura
        alert(`DEBUG: Arquivo lido! Total de ${mapped.length} contatos válidos identificados. Iniciando processamento...`);
        
        setParsedData(mapped);
        setProgress({ current: 0, total: mapped.length, percentage: 0, debugText: 'Pronto para enviar' });
        setStatus('ready');
      },
      error: (err) => {
        const msg = "Erro no Parser: " + err.message;
        alert(msg);
        setStatus('error');
        setErrorMsg(msg);
      }
    });
  };

  // 2. IMPORTAÇÃO COM TIMEOUT E LOGS
  const startImport = async () => {
    if (!user || parsedData.length === 0) return;
    setStatus('importing');

    const BATCH_SIZE = 50;
    const total = parsedData.length;
    let processed = 0;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = parsedData.slice(i, i + BATCH_SIZE);
      
      // CHECKPOINT 3: Feedback granular na UI
      setProgress(prev => ({ ...prev, debugText: `Preparando lote: item ${i} de ${total}...` }));

      try {
        // 5 SECONDS TIMEOUT RACE
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout: O banco demorou mais de 5s para responder este lote.")), 5000)
        );

        const dbPromise = supabase
          .from('clients')
          .upsert(batch, { onConflict: 'whatsapp' });

        // Executa a operação ou morre em 5 segundos
        const { error } = await Promise.race([dbPromise, timeoutPromise]) as any;

        if (error) throw error;

        processed += batch.length;
        const percentage = Math.round((processed / total) * 100);
        
        setProgress({ 
            current: processed, 
            total, 
            percentage, 
            debugText: `Lote ${i} enviado com sucesso!` 
        });

        // Delay para não congelar a aba
        await new Promise(resolve => setTimeout(resolve, 20));

      } catch (e: any) {
        // CHECKPOINT 4: Erro explícito
        const fatalError = `FALHA NA IMPORTAÇÃO (Item ${i}): ${e.message}`;
        console.error(fatalError);
        alert(fatalError); // Força o alerta na tela para o usuário ver onde parou
        setStatus('error');
        setErrorMsg(fatalError);
        return; // Interrompe para evitar cascata de erros
      }
    }

    setStatus('done');
    alert("DEBUG: Sucesso! Processo concluído sem interrupções.");
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <Database className="text-orange-500" size={24} />
              Importação (Debug Mode)
            </h2>
            <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mt-1">Monitoramento de Lote Ativo</p>
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
              <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                <Upload size={40} strokeWidth={3} />
              </div>
              <h3 className="text-lg font-black text-slate-700">Carregar CSV</h3>
              <p className="text-xs text-slate-400 mt-2 font-bold uppercase text-center">Iniciaremos logs visuais ao selecionar.</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={handleFileSelection} />
            </div>
          )}

          {(status === 'parsing' || status === 'importing') && (
            <div className="py-12 flex flex-col items-center justify-center space-y-6">
              <Loader2 className="animate-spin text-orange-500" size={56} strokeWidth={3} />
              <div className="text-center w-full max-w-xs">
                <h3 className="text-lg font-black text-slate-800">
                  {status === 'parsing' ? 'Validando Arquivo...' : 'Salvando no Banco...'}
                </h3>
                <div className="mt-4 w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                    <div 
                        className="h-full bg-orange-500 transition-all duration-300 shadow-[0_0_10px_rgba(249,115,22,0.5)]" 
                        style={{ width: `${progress.percentage}%` }}
                    />
                </div>
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mt-4 bg-slate-50 py-2 rounded-lg">
                  {progress.debugText}
                </p>
              </div>
            </div>
          )}

          {status === 'ready' && (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex items-center gap-5">
                <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-lg">
                  <Table size={24} />
                </div>
                <div>
                  <p className="text-lg font-black text-emerald-900 leading-none">{progress.total} Contatos Identificados</p>
                  <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mt-1">Pronto para disparar a gravação.</p>
                </div>
              </div>

              <button 
                onClick={startImport}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-5 rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 text-lg transition-all active:scale-95"
              >
                Confirmar e Iniciar <ArrowRight size={22} />
              </button>
            </div>
          )}

          {status === 'done' && (
            <div className="py-12 text-center animate-in fade-in zoom-in-95">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-50">
                <Check size={48} strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-slate-800">Carga Finalizada!</h3>
              <p className="text-slate-500 font-medium mt-2">Logs registrados. Verifique sua lista principal.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="bg-rose-50 border border-rose-100 rounded-[32px] p-8 text-center border-2">
                <AlertTriangle size={48} className="text-rose-500 mx-auto mb-4" />
                <h3 className="text-lg font-black text-rose-900 uppercase">Falha Bloqueante</h3>
                <p className="text-sm font-bold text-rose-700 mt-2 bg-white p-3 rounded-xl border border-rose-200">{errorMsg}</p>
              </div>
              <button onClick={() => window.location.reload()} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black">Reiniciar Aplicativo</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportClientsModal;
