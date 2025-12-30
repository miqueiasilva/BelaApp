
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

  // 1. LEITURA E MAPEAMENTO (DE-PARA)
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    alert("DEBUG: Iniciando leitura do arquivo...");
    setStatus('parsing');
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      encoding: "ISO-8859-1",
      complete: (results) => {
        const mapped = results.data.map((row: any) => {
           // Mapeamento exato das colunas do seu CSV
           const nome = row['Nome'] || row['nome'];
           const apelido = row['Apelido'] || row['apelido'];
           const rawTel = row['Telefone 1'] || row['telefone 1'] || row['whatsapp'];
           const sexo = row['Sexo'] || row['sexo'];
           
           const cleanedTel = rawTel ? rawTel.toString().replace(/\D/g, '') : '';

           return {
             nome: nome?.toString().trim(),
             apelido: apelido?.toString().trim(),
             whatsapp: cleanedTel,
             sexo: sexo?.toString().trim(),
             user_id: user?.id,
             consent: true,
             origem: 'Importação Manual'
           };
        }).filter(item => item.nome && item.whatsapp.length >= 8);

        alert(`DEBUG: ${mapped.length} contatos válidos mapeados. Pronto para iniciar verificação de duplicidade.`);
        
        setParsedData(mapped);
        setProgress({ current: 0, total: mapped.length, percentage: 0, debugText: 'Aguardando confirmação...' });
        setStatus('ready');
      },
      error: (err) => {
        alert("Erro no Parser: " + err.message);
        setStatus('error');
      }
    });
  };

  // 2. IMPORTAÇÃO MANUAL "CHECK-THEN-WRITE" (ANTI-CONSTRANT ERROR)
  const startImport = async () => {
    if (!user || parsedData.length === 0) return;
    setStatus('importing');

    const total = parsedData.length;
    let processed = 0;

    // Processamos em um loop serial para garantir integridade e feedback visual
    for (const clientItem of parsedData) {
      try {
        const currentCount = processed + 1;
        setProgress(prev => ({ 
          ...prev, 
          debugText: `Verificando (${currentCount}/${total}): ${clientItem.nome}...` 
        }));

        // PASSO 1: Buscar se já existe pelo WhatsApp
        const { data: existingClient, error: searchError } = await supabase
          .from('clients')
          .select('id')
          .eq('whatsapp', clientItem.whatsapp)
          .maybeSingle();

        if (searchError) throw new Error(`Erro na busca: ${searchError.message}`);

        // PASSO 2: Ramificação (Update ou Insert)
        if (existingClient) {
          // Já existe -> UPDATE
          const { error: updateError } = await supabase
            .from('clients')
            .update(clientItem)
            .eq('id', existingClient.id);
          
          if (updateError) throw new Error(`Erro ao atualizar: ${updateError.message}`);
        } else {
          // Não existe -> INSERT
          const { error: insertError } = await supabase
            .from('clients')
            .insert([clientItem]);
          
          if (insertError) throw new Error(`Erro ao inserir: ${insertError.message}`);
        }

        // Atualiza progresso
        processed++;
        const percentage = Math.round((processed / total) * 100);
        setProgress({ 
            current: processed, 
            total, 
            percentage, 
            debugText: `Processado com sucesso: ${clientItem.nome}` 
        });

        // Event Loop Yielding: Pequeno respiro a cada registro para não travar a aba
        if (processed % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 5));
        }

      } catch (e: any) {
        const msg = `ERRO NA LINHA ${processed + 1}: ${e.message}`;
        console.error(msg);
        
        // Decisão: Ignoramos o erro da linha e continuamos o processo
        // Apenas atualizamos o contador para não travar o loop
        processed++;
      }
    }

    setStatus('done');
    alert(`DEBUG: Processamento Finalizado! ${processed} registros analisados.`);
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <Database className="text-orange-500" size={24} />
              Sincronização de Base
            </h2>
            <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mt-1">Modo: Verificação de Existente (Lento porém Seguro)</p>
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
              <h3 className="text-lg font-black text-slate-700">Carregar Planilha</h3>
              <p className="text-xs text-slate-400 mt-2 font-bold uppercase text-center">Analizaremos linha por linha para evitar duplicidade.</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={handleFileSelection} />
            </div>
          )}

          {(status === 'parsing' || status === 'importing') && (
            <div className="py-12 flex flex-col items-center justify-center space-y-6">
              <Loader2 className="animate-spin text-orange-500" size={56} strokeWidth={3} />
              <div className="text-center w-full max-w-xs">
                <h3 className="text-lg font-black text-slate-800">
                  {status === 'parsing' ? 'Lendo Arquivo...' : 'Sincronizando...'}
                </h3>
                <div className="mt-4 w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                    <div 
                        className="h-full bg-orange-500 transition-all duration-300 shadow-[0_0_10px_rgba(249,115,22,0.5)]" 
                        style={{ width: `${progress.percentage}%` }}
                    />
                </div>
                <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                   <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest text-center">
                     {progress.debugText}
                   </p>
                </div>
                <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase">Status: {progress.current} de {progress.total}</p>
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
                  <p className="text-lg font-black text-emerald-900 leading-none">{progress.total} Contatos Mapeados</p>
                  <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mt-1">Tudo pronto para gravar no banco.</p>
                </div>
              </div>

              <button 
                onClick={startImport}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-5 rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 text-lg transition-all active:scale-95"
              >
                Confirmar Sincronização <ArrowRight size={22} />
              </button>
            </div>
          )}

          {status === 'done' && (
            <div className="py-12 text-center animate-in fade-in zoom-in-95">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-50">
                <Check size={48} strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-slate-800">Sincronizado!</h3>
              <p className="text-slate-500 font-medium mt-2">Sua lista de clientes agora está atualizada.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="bg-rose-50 border border-rose-100 rounded-[32px] p-8 text-center border-2">
                <AlertTriangle size={48} className="text-rose-500 mx-auto mb-4" />
                <h3 className="text-lg font-black text-rose-900 uppercase">Falha Bloqueante</h3>
                <p className="text-sm font-bold text-rose-700 mt-2 bg-white p-3 rounded-xl border border-rose-200">{errorMsg}</p>
              </div>
              <button onClick={() => window.location.reload()} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black">Reiniciar e Tentar Novamente</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportClientsModal;
