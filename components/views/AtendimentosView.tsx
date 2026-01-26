
import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useStudio } from '../../contexts/StudioContext';
import { LegacyAppointment, FinancialTransaction } from '../../types';
import Toast, { ToastType } from '../shared/Toast';
import { Loader2 } from 'lucide-react';
import AdminDashboard from '../admin/AdminDashboard';

/**
 * FIX: Helper function to validate UUID format.
 * Resolves "Cannot find name 'isUUID'" error.
 */
const isUUID = (id: any): boolean => {
    if (!id || typeof id !== 'string' || id === '') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

interface AtendimentosViewProps {
    onAddTransaction?: (t: FinancialTransaction) => void;
    onNavigateToCommand?: (id: string) => void;
}

const AtendimentosView: React.FC<AtendimentosViewProps> = ({ onAddTransaction, onNavigateToCommand }) => {
    const { activeStudioId } = useStudio();
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [activeAppointmentDetail, setActiveAppointmentDetail] = useState<any>(null);

    /**
     * FIX: handleConvertToCommand implementation to fix undefined variable errors.
     * Resolves multiple "Cannot find name" errors: LegacyAppointment, activeStudioId, 
     * setIsLoadingData, isUUID, supabase, setToast, setActiveAppointmentDetail, onNavigateToCommand.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleConvertToCommand = async (appointment: LegacyAppointment) => {
        if (!activeStudioId) return;
        setIsLoadingData(true);
        try {
            const clientId = isUUID(appointment.client?.id) ? appointment.client?.id : null;
            const resolvedClientName = appointment.client?.nome || (appointment as any).client_name || 'Consumidor Final';
            let commandId = null;
            let existingCommand = null;

            if (clientId) {
                const { data: cmdSearch } = await supabase
                    .from('commands')
                    .select('id, total_amount')
                    .eq('client_id', clientId)
                    .eq('studio_id', activeStudioId)
                    .eq('status', 'open')
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                if (cmdSearch) {
                    existingCommand = cmdSearch;
                    commandId = cmdSearch.id;
                }
            }

            if (!commandId) {
                const { data: command, error: cmdError } = await supabase
                    .from('commands')
                    .insert([{
                        studio_id: activeStudioId,
                        client_id: clientId,
                        professional_id: isUUID(appointment.professional.id) ? appointment.professional.id : null,
                        status: 'open',
                        total_amount: appointment.service.price,
                        client_name: resolvedClientName 
                    }])
                    .select()
                    .single();

                if (cmdError) throw cmdError;
                commandId = command.id;
            } else {
                const newTotal = Number(existingCommand.total_amount || 0) + Number(appointment.service.price);
                await supabase.from('commands').update({ total_amount: newTotal }).eq('id', commandId);
            }

            const { data: itemSearch } = await supabase
                .from('command_items')
                .select('id')
                .eq('command_id', commandId)
                .eq('appointment_id', appointment.id)
                .maybeSingle();

            if (!itemSearch) {
                const { error: itemError } = await supabase
                    .from('command_items')
                    .insert([{
                        command_id: commandId,
                        appointment_id: appointment.id,
                        service_id: isUUID(appointment.service.id) ? String(appointment.service.id) : null,
                        studio_id: activeStudioId, 
                        title: appointment.service.name,
                        price: appointment.service.price,
                        quantity: 1,
                        professional_id: isUUID(appointment.professional.id) ? appointment.professional.id : null
                    }]);

                if (itemError) throw itemError;
            }

            const { error: apptUpdateError } = await supabase
                .from('appointments')
                .update({ status: 'concluido' })
                .eq('id', appointment.id);

            if (apptUpdateError) throw apptUpdateError;

            setToast({ message: existingCommand ? `Adicionado à comanda aberta! 💳` : `Comanda gerada! Redirecionando... 💳`, type: 'success' });
            setActiveAppointmentDetail(null);
            
            if (onNavigateToCommand) {
                onNavigateToCommand(commandId);
            }
        } catch (e: any) {
            console.error("Falha ao processar comando:", e);
            setToast({ message: "Erro ao converter agendamento.", type: 'error' });
        } finally {
            setIsLoadingData(false);
        }
    };

    return (
        <div className="h-full relative overflow-hidden">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {isLoadingData && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-orange-500 mb-2" size={48} />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Processando Comanda...</p>
                </div>
            )}
            <AdminDashboard />
        </div>
    );
};

export default AtendimentosView;
