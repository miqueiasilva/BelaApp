
import React, { useState, useRef } from 'react';
import { X, Upload, Database, Table, Check, AlertTriangle, Loader2, FileText, ArrowRight } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

interface ImportClientsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const BATCH_SIZE = 100; // Tamanho ideal para evitar estouro de payload e timeout

const ImportClientsModal: React.FC<ImportClientsModalProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'parsing' | 'ready' | 'importing' | 'done' | 'error'>('idle');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0, debugText: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('parsing');
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      encoding: "ISO-8859-1",
      complete: (results) => {
        const mapped = results.data.map((row: any) => {
           // Mapeamento das colunas (Suporta Nome, Telefone 1, Sexo, Apelido)
           const nome = row['Nome'] || row['nome'];
           const rawTel = row['Telefone 1'] || row['telefone 1'] || row['whatsapp'] || row['Telefone'];
           
           const cleanedTel = rawTel ? rawTel.toString().replace(/\D/g, '') : '';

           return {
             nome: nome?.toString().trim(),
             apelido: (row['Apelido'] || row['apelido'])?.toString().trim() || null,
             whatsapp: cleanedTel,
             gender: (row['Sexo'] || row['sexo'])?.toString().trim() || null,
             user_id: user?.id,
             consent: true,
             origem: 'Importação Planilha',
             // Garante que campos vazios sejam nulos para o Postgres
             email: row['E-mail'] || row['email'] || null,
             birth_date: row['Nascimento'] || row['nascimento'] || null
           };
        }).filter(item => item.nome && item.whatsapp && item.whatsapp.length >= 8);

        if (mapped.length === 0) {
            setErrorMsg("Nenhum registro válido encontrado. Verifique se as colunas 'Nome' e 'Telefone' existem.");
            setStatus('error');
            return;
        }

        setParsedData(mapped);
        setProgress({ current: 0, total: mapped.length, percentage: 0, debugText: 'Pronto para importar' });
        setStatus('ready');
      },
      error: (err) => {
        setErrorMsg("Falha ao ler o arquivo: " + err.message);
        setStatus('error');
      }
    });
  };

  const startImport = async () => {
    if (!user || parsedData.length === 0) return;
    setStatus('importing');

    const total = parsedData.length;
    let processed = 0;

    // Divide os dados em lotes (Chunks)
    const chunks = [];
    for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
        chunks.push(parsedData.slice(i, i + BATCH_SIZE));
    }

    try {
        for (const batch of chunks) {
            // Verificação de RLS e Batch Insert (Upsert por WhatsApp para evitar duplicidade)
            const { error } = await supabase
                .from('clients')
                .upsert(batch, { 
                    onConflict: 'whatsapp',
                    ignoreDuplicates: false 
                });

            if (error) {
                // Se o Supabase retornar erro, capturamos e interrompemos
                console.error("Erro no lote do Supabase:", error);
                throw new Error(`Erro no Banco de Dados: ${error.message} (Código: ${error.code})`);
            }

            processed += batch.length;
            const percentage = Math.round((processed / total) * 100);
            
            setProgress({ 
                current: processed, 
                total, 
                percentage, 
                debugText: `Sincronizando lote... ${percentage}%` 
            });

            // Pequeno delay para liberar a UI thread
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        setStatus('done');
        setTimeout(() => {
            onSuccess();
            onClose();
        }, 1500);

    } catch (e: any) {
        setErrorMsg(e.message || "Erro desconhecido durante a importação.");
        setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <Database className="text-orange-500" size={24} />
              Importação em Lote
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sincronização Segura via Supabase Engine</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24} /></button>
        </header>

        <div className="p-8">
          {status === 'idle' && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-4 border-dashed border-slate-100 rounded-[40px] p-16 flex flex-col items-center justify-center cursor-pointer hover:border-orange-200 hover:bg-orange-50/30 transition-all group"
            >
              <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Upload size={40} strokeWidth={3} />
              </div>
              <h3 className="text-lg font-black text-slate-700">Selecionar Planilha</h3>
              <p className="text-xs text-slate-400 mt-2 font-bold uppercase text-center">Formatos suportados: .CSV (Separado por vírgula ou ponto e vírgula)</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={handleFileSelection} />
            </div>
          )}

          {status === 'parsing' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-orange-500" size={48} />
              <p className="text-sm font-black text-slate-600 uppercase tracking-widest">Processando arquivo...</p>
            </div>
          )}

          {status === 'importing' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-6">
              <Loader2 className="animate-spin text-orange-500" size={56} strokeWidth={3} />
              <div className="text-center w-full max-w-xs">
                <h3 className="text-lg font-black text-slate-800">Enviando para o Banco</h3>
                <div className="mt-4 w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                    <div 
                        className="h-full bg-orange-500 transition-all duration-300 shadow-[0_0_10px_rgba(249,115,22,0.5)]" 
                        style={{ width: `${progress.percentage}%` }}
                    />
                </div>
                <p className="text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">
                   {progress.current} de {progress.total} registros processados
                </p>
                <p className="text-[9px] text-orange-500 font-black mt-1 uppercase italic">{progress.debugText}</p>
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
                  <p className="text-lg font-black text-emerald-900 leading-none">{progress.total} Registros Identificados</p>
                  <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mt-1">Estrutura validada com sucesso.</p>
                </div>
              </div>

              <button 
                onClick={startImport}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-5 rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 text-lg transition-all active:scale-95"
              >
                Iniciar Importação <ArrowRight size={22} />
              </button>
            </div>
          )}

          {status === 'done' && (
            <div className="py-12 text-center animate-in fade-in zoom-in-95">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-50">
                <Check size={48} strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-slate-800">Sucesso Absoluto!</h3>
              <p className="text-slate-500 font-medium mt-2">Todos os registros foram confirmados pelo banco.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6 animate-in shake duration-300">
              <div className="bg-rose-50 border-2 border-rose-100 rounded-[32px] p-8 text-center">
                <AlertTriangle size={48} className="text-rose-500 mx-auto mb-4" />
                <h3 className="text-lg font-black text-rose-900 uppercase">Falha na Sincronização</h3>
                <div className="mt-4 bg-white p-4 rounded-2xl border border-rose-200 text-left">
                    <p className="text-xs font-mono text-rose-600 break-words">{errorMsg}</p>
                </div>
                <p className="text-[10px] text-rose-400 font-bold uppercase mt-4">Dica: Verifique se sua conexão está estável ou se há campos obrigatórios vazios.</p>
              </div>
              <button 
                onClick={() => { setStatus('idle'); setErrorMsg(''); }} 
                className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black hover:bg-slate-900 transition-all"
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportClientsModal;
