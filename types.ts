
export type UserRole = 'admin' | 'gestor' | 'recepcao' | 'profissional';

export type ViewState = 
  | 'dashboard' 
  | 'agenda' 
  | 'agenda_online' 
  | 'whatsapp' 
  | 'financeiro' 
  | 'clientes' 
  | 'relatorios' 
  | 'configuracoes' 
  | 'remuneracoes' 
  | 'vendas' 
  | 'comandas' 
  | 'caixa' 
  | 'produtos' 
  | 'servicos' 
  | 'public_preview' 
  | 'equipe';

export type AppointmentStatus = 
  | 'confirmado' 
  | 'confirmado_whatsapp' 
  | 'agendado' 
  | 'chegou' 
  | 'concluido' 
  | 'cancelado' 
  | 'bloqueado' 
  | 'faltou' 
  | 'em_atendimento' 
  | 'em_espera';

export type TransactionType = 'receita' | 'despesa' | 'income' | 'expense';

export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'transferencia' | 'boleto';

export type TransactionCategory = string;

export interface Client {
  id?: number;
  nome: string;
  apelido?: string;
  whatsapp?: string;
  telefone?: string;
  email?: string;
  instagram?: string;
  nascimento?: string;
  cpf?: string;
  rg?: string;
  sexo?: string;
  profissao?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  photo_url?: string | null;
  online_booking_enabled?: boolean;
  origem?: string;
  observacoes?: string;
  consent: boolean;
  tags?: string[];
  postal_code?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  birth_date?: string;
}

export interface LegacyProfessional {
  id: number;
  name: string;
  avatarUrl: string;
  role?: string;
  order_index?: number;
  services_enabled?: number[];
  active?: boolean;
  photo_url?: string;
}

export interface LegacyService {
  id: number;
  name: string;
  duration: number;
  price: number;
  color: string;
  category?: string;
  description?: string;
}

export interface Service {
  id: number;
  nome: string;
  duracao_min: number;
  preco: number;
  cor_hex: string;
  ativo: boolean;
  categoria?: string;
  descricao?: string;
}

export interface LegacyAppointment {
  id: number;
  client?: Client;
  professional: LegacyProfessional;
  service: LegacyService;
  start: Date;
  end: Date;
  status: AppointmentStatus;
  notas?: string;
}

export interface FinancialTransaction {
  id: number;
  description: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  date: Date;
  paymentMethod: PaymentMethod;
  status: 'pago' | 'pendente';
  professionalId?: number;
  appointment_id?: number;
  client_id?: number;
}

export interface Product {
  id: number;
  name: string;
  sku?: string;
  stock_quantity: number;
  min_stock: number;
  cost_price?: number;
  price: number;
  active: boolean;
}

export interface OnlineBookingConfig {
  isActive: boolean;
  slug: string;
  studioName: string;
  description: string;
  coverUrl?: string;
  logoUrl?: string;
  timeIntervalMinutes?: number;
  minAdvanceHours?: number;
  maxFutureDays?: number;
  cancellationPolicyHours?: number;
  showStudioInSearch?: boolean;
}

export interface Review {
  id: number;
  clientName: string;
  rating: number;
  comment: string;
  date: Date;
  serviceName?: string;
  reply?: string;
}

export interface AnalyticsData {
  pageViews: {
    profile: number;
    gallery: number;
    details: number;
    reviews: number;
  };
  conversion: {
    started: number;
    completed: number;
    whatsappClicks: number;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'client' | 'system';
  text: string;
  timestamp: Date;
  status: 'sent' | 'read';
}

export interface ChatConversation {
  id: number;
  clientId: number;
  clientName: string;
  clientAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: ChatMessage[];
  tags?: string[];
}
