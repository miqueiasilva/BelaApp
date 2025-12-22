
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

// --- 1. TELA DE CARREGAMENTO ROBUSTA ---
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
        <p className="text-slate-600 font-bold text-lg">Sincronizando Belaflow...</p>
        <p className="text-slate-400 text-xs mt-1 px-8 max-w-xs">
          Verificando sua conta e preparando o ambiente de trabalho.
        </p>
      </div>
      <button 
        onClick={forceLogout}
        className="mt-12 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors border border-slate-200 px-4 py-2 rounded-full"
      >
        O sistema travou? Clique aqui para reiniciar
      </button>
    </div>
  );
};

// --- 2. WRAPPER PARA ÁREA ADMINISTRATIVA ---
const AdminWrapper: React.FC<{ transactions: FinancialTransaction[], onAddTransaction: (t: FinancialTransaction) => void }> = ({ transactions, onAddTransaction }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Mapeia o path atual para o ViewState esperado pelo MainLayout legado
  const currentView = (location.pathname.replace('/', '') || 'dashboard') as ViewState;

  return (
    <MainLayout currentView={currentView} onNavigate={(view) => navigate(`/${view}`)}>
      <Outlet context={{ transactions, onAddTransaction }} />
    </MainLayout>
  );
};

// --- 3. GERENCIADOR DE ROTAS INTERNO (LÓGICA BLINDADA) ---
function AppRoutes() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(mockTransactions);
  
  const path = location.pathname;

  // LÓGICA DE PRIORIDADE:
  
  // 1. ROTAS PÚBLICAS (Bypass absoluto - Sem check de auth ou loading)
  if (path === '/agendar' || path === '/public-preview') {
    return <PublicBookingView />;
  }

  // 2. RECUPERAÇÃO DE SENHA (Bypass auth check)
  if (path === '/reset-password') {
    return <ResetPasswordView />;
  }

  // 3. ESTADO DE CARREGAMENTO (Apenas para rotas protegidas)
  if (loading) {
    return <LoadingScreen />;
  }

  // 4. NÃO AUTENTICADO -> LOGIN
  if (!user) {
    return <LoginView />;
  }

  // 5. AUTENTICADO -> ÁREA ADMINISTRATIVA
  const handleAddTransaction = (t: FinancialTransaction) => {
    setTransactions(prev => [t, ...prev]);
  };

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
      {/* Fallback para home caso a rota não exista */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// --- 4. APLICAÇÃO PRINCIPAL ---
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
