
import { UserRole, ViewState } from '../types';

const ROLE_PERMISSIONS: Record<UserRole, (ViewState | '*')[]> = {
    // Admins e Gestores: Acesso irrestrito
    admin: ['*'],
    gestor: ['*'],
    
    // Recepção: Operacional completo, exceto configurações globais e relatórios financeiros profundos
    recepcao: [
        'dashboard', 
        'agenda', 
        'agenda_online', 
        'clientes', 
        'vendas', 
        'comandas', 
        'caixa', 
        'servicos', 
        'produtos',
        'whatsapp'
    ],
    
    // Profissional (Staff): Foco total no atendimento e cliente
    // Bloqueados: Financeiro, Relatórios, Configurações, Controle de Caixa, Remunerações (Globais)
    profissional: [
        'dashboard', 
        'agenda', 
        'clientes', 
        'comandas', 
        'whatsapp',
        'vendas' // Permitido para que possam lançar produtos consumidos
    ]
};

export const hasAccess = (role: UserRole | string | undefined, view: ViewState): boolean => {
    if (!role) return false;
    const permissions = ROLE_PERMISSIONS[role as UserRole] || ROLE_PERMISSIONS['profissional'];
    if (permissions.includes('*')) return true;
    return permissions.includes(view);
};

export const getFirstAllowedView = (role: UserRole | string | undefined): ViewState => {
    if (!role) return 'dashboard';
    const permissions = ROLE_PERMISSIONS[role as UserRole] || ROLE_PERMISSIONS['profissional'];
    if (permissions.includes('*')) return 'dashboard';
    return (permissions[0] as ViewState) || 'dashboard';
};
