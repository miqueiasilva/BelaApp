
import React, { useState } from 'react';
import { LegacyAppointment, FinancialTransaction } from '../../types';
import { supabase } from '../../services/supabaseClient';
import AdminDashboard from '../admin/AdminDashboard';
import Toast, { ToastType } from '../shared/Toast';
import { Loader2 } from 'lucide-react';

interface AtendimentosViewProps {
    onAddTransaction: (t: FinancialTransaction) => void;
    onNavigateToCommand?: (id: string) => void;
}

const AtendimentosView: React.FC<AtendimentosViewProps> = ({ onAddTransaction, onNavigateToCommand }) => {
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const handleConvertToCommand = async (appointment: LegacyAppointment) => {
        setIsLoadingData(true);
        try {
            // 1. Criar a Comanda vinculada ao Cliente e Profissional da Agenda
            const { data: command, error: cmdError } = await supabase
                .from('commands')
                .insert([{
                    client_id: appointment.client?.id,
                    professional_id: appointment.professional.id, // Vínculo principal para a comanda
                    status: 'open',
                    total_amount: Number(appointment.service.price)
                }])
                .select()
                .single();

            if (cmdError) throw cmdError;

            // 2. Lançar o item da agenda na comanda com o profissional executor
            const { error: itemError } = await supabase
                .from('command_items')
                .insert([{
                    command_id: command.id,
                    appointment_id: appointment.id,
                    title: appointment.service.name,
                    price: Number(appointment.service.price),
                    quantity: 1,
                    professional_id: appointment.professional.id, // Fundamental para comissão por item
                    service_id: appointment.service.id !== 0 ? appointment.service.id : null
                }]);

            if (itemError) throw itemError;

            // 3. Marcar agendamento como concluído (evita duplo faturamento)
            await supabase
                .from('appointments')
                .update({ status: 'concluido' })
                .eq('id', appointment.id);

            setToast({ message: "Comanda gerada! Redirecionando para o checkout...", type: 'success' });
            
            if (onNavigateToCommand) {
                onNavigateToCommand(command.id);
            }
        } catch (e: any) {
            console.error("[BRIDGE_ERROR]", e);
            setToast({ message: "Falha ao criar comanda: IDs de cliente/profissional inválidos.", type: 'error' });
        } finally {
            setIsLoadingData(false);
        }
    };

    return (
        <div className="h-full flex flex-col relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {isLoadingData && (
                <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-[32px] shadow-2xl flex flex-col items-center gap-4 border border-slate-100">
                        <Loader2 className="animate-spin text-orange-500" size={48} />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Preparando Comanda...</p>
                    </div>
                </div>
            )}
            {/* O AdminDashboard deve receber o callback de conversão via props se houver botões internos */}
            <AdminDashboard />
        </div>
    );
};

export default AtendimentosView;
