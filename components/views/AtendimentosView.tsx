
import React, { useState } from 'react';
// FIX: Added missing imports for types and supabase client.
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
    // FIX: Defined missing state variables used in handleConvertToCommand to resolve "Cannot find name" errors.
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [activeAppointmentDetail, setActiveAppointmentDetail] = useState<any>(null);

    // FIX: Wrapped the previously loose function handleConvertToCommand in a functional component 'AtendimentosView' to resolve "not a module" and scope errors.
    const handleConvertToCommand = async (appointment: LegacyAppointment) => {
        setIsLoadingData(true);
        try {
            // 1. Criar a Comanda Pai vinculada ao Cliente
            const { data: command, error: cmdError } = await supabase
                .from('commands')
                .insert([{
                    client_id: appointment.client?.id, // ID OBRIGATÓRIO PARA IDENTIFICAR O CLIENTE
                    status: 'open',
                    total_amount: Number(appointment.service.price)
                }])
                .select()
                .single();

            if (cmdError) throw cmdError;

            // 2. Criar o Item da Comanda vinculado ao Profissional (Fundamental para Comissões)
            const { error: itemError } = await supabase
                .from('command_items')
                .insert([{
                    command_id: command.id,
                    appointment_id: appointment.id,
                    title: appointment.service.name,
                    price: Number(appointment.service.price),
                    quantity: 1,
                    // CORREÇÃO CRÍTICA: Gravando o profissional que realizou o serviço na comanda
                    professional_id: appointment.professional.id, 
                    service_id: appointment.service.id !== 0 ? appointment.service.id : null
                }]);

            if (itemError) throw itemError;

            // 3. Atualizar o status na Agenda para evitar duplicidade de cobrança
            const { error: apptUpdateError } = await supabase
                .from('appointments')
                .update({ status: 'concluido' })
                .eq('id', appointment.id);

            if (apptUpdateError) throw apptUpdateError;

            setToast({ message: `Comanda gerada com sucesso! Redirecionando... 💳`, type: 'success' });
            setActiveAppointmentDetail(null);
            
            // 4. Navegação para o Checkout com os dados persistidos
            if (onNavigateToCommand) {
                onNavigateToCommand(command.id);
            }
        } catch (e: any) {
            console.error("Erro crítico na geração de comanda:", e);
            setToast({ message: `Falha na conversão: ${e.message || "Verifique os IDs de cliente/serviço"}`, type: 'error' });
        } finally {
            setIsLoadingData(false);
        }
    };

    return (
        <div className="h-full flex flex-col relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {isLoadingData && (
                <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
                    <Loader2 className="animate-spin text-orange-500" size={32} />
                </div>
            )}
            <AdminDashboard />
        </div>
    );
};

export default AtendimentosView;
