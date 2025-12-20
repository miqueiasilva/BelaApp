
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ViewState, FinancialTransaction } from './types';
import EnvGate from './components/EnvGate';
import { supabase } from './services/supabaseClient';

// Layout & Views
import MainLayout from './components/layout/MainLayout';
import LoginView from './components/views/LoginView';
import ResetPasswordView from './components/views/ResetPasswordView';
import DashboardView from './components/views/DashboardView';
import AtendimentosView from './components/views/AtendimentosView';
import AgendaOnlineView from './components/views/AgendaOnlineView';
import WhatsAppView from './components/views/WhatsAppView';
import FinanceiroView from './components/views/FinanceiroView';
import ClientesView from './components/views/ClientesView';
import RelatoriosView from './components/views/RelatoriosView';
import ConfiguracoesView from './components/views/ConfiguracoesView';
import RemuneracoesView from './components/views/RemuneracoesView';
import VendasView from './components/views/VendasView';
import ComandasView from './components/views/ComandasView';
import CaixaView from './components/views/CaixaView';
import ProdutosView from './components/views/ProdutosView';
import ServicosView from './components/views/ServicosView';
import EquipeView from './components/views/EquipeView';
import PublicBookingView from './components/views/PublicBookingView';

import { mockTransactions } from './data/mockData';

// --- 1. TELA DE CARREGAMENTO COM BOTÃO DE EMERGÊNCIA ---
const LoadingScreen = () => {
  const forceLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-4 font-sans">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="text-center">
        <p className="text-slate-600 font-bold">Iniciando Belaflow...</p>
        <p className="text-slate-400 text-xs mt-1 px-8 max-w-xs">Verificando segurança e carregando dados do seu estúdio.</p>
      </div>
      <button 
        onClick={forceLogout}
        className="mt-8 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 underline cursor-pointer p-4"
      >
        O sistema travou? Clique aqui para sair.
      </button>
    </div>
  );
};

// --- 2. WRAPPER PARA SINCRONIZAR ROTAS COM O LAYOUT ANTIGO ---
const AdminWrapper: React.FC<{ transactions: FinancialTransaction[], onAddTransaction: (t: FinancialTransaction) => void }> = ({ transactions, onAddTransaction }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Mapeia o path atual para o ViewState esperado pelo MainLayout legado
  const getViewFromPath = (path: string): ViewState => {
    const cleanPath = path.replace('/', '') || 'dashboard';
    return cleanPath as ViewState;
  };

  const currentView = getViewFromPath(location.pathname);

  return (
    <MainLayout currentView={currentView} onNavigate={(view) => navigate(`/${view}`)}>
      <Outlet context={{ transactions, onAddTransaction }} />
    </MainLayout>
  );
};

// --- 3. GERENCIADOR DE ROTAS INTERNO ---
function AppRoutes() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(mockTransactions);

  // LISTA DE ROTAS PÚBLICAS
  const publicPaths = ['/agendar', '/public-preview'];
  const isPublic = publicPaths.some(path => location.pathname.startsWith(path));

  // SE FOR ROTA PÚBLICA, RENDERIZA DIRETO (Bypass Auth check)
  if (isPublic) {
    return (
      <Routes>
        <Route path="/agendar" element={<PublicBookingView />} />
        <Route path="/public-preview" element={<PublicBookingView />} />
      </Routes>
    );
  }

  // --- LÓGICA DE USUÁRIO LOGADO ---
  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordView />} />
        <Route path="*" element={<LoginView />} />
      </Routes>
    );
  }

  const handleAddTransaction = (t: FinancialTransaction) => {
    setTransactions(prev => [t, ...prev]);
  };

  // SISTEMA PROTEGIDO (ADMIN)
  return (
    <Routes>
      <Route element={<AdminWrapper transactions={transactions} onAddTransaction={handleAddTransaction} />}>
        <Route index element={<DashboardView onNavigate={(v) => window.location.hash = `#/${v}`} />} />
        <Route path="dashboard" element={<DashboardView onNavigate={(v) => window.location.hash = `#/${v}`} />} />
        <Route path="agenda" element={<AtendimentosView onAddTransaction={handleAddTransaction} />} />
        <Route path="agenda_online" element={<AgendaOnlineView />} />
        <Route path="whatsapp" element={<WhatsAppView />} />
        <Route path="financeiro" element={<FinanceiroView />} />
        <Route path="clientes" element={<ClientesView />} />
        <Route path="relatorios" element={<RelatoriosView />} />
        <Route path="configuracoes" element={<ConfiguracoesView />} />
        <Route path="remuneracoes" element={<RemuneracoesView />} />
        <Route path="vendas" element={<VendasView />} />
        <Route path="comandas" element={<ComandasView />} />
        <Route path="caixa" element={<CaixaView />} />
        <Route path="produtos" element={<ProdutosView />} />
        <Route path="servicos" element={<ServicosView />} />
        <Route path="equipe" element={<EquipeView />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// --- 4. APP PRINCIPAL ---
export default function App() {
  return (
    <EnvGate>
      <HashRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </HashRouter>
    </EnvGate>
  );
}
