
import React from 'react';
import { 
  Home, 
  Calendar, 
  Globe, 
  MessageCircle, 
  Repeat, 
  Users, 
  BarChart3, 
  Settings, 
  DollarSign, 
  ShoppingCart, 
  ClipboardList, 
  Package, 
  LogOut,
  Box,
  Layers
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, isMobile, onCloseMobile }) => {
  
  const handleLogout = async () => {
    const confirm = window.confirm("Deseja realmente sair do sistema?");
    if (confirm) {
      // 1. Desconecta do Supabase
      await supabase.auth.signOut();
      
      // 2. Limpa qualquer lixo da memória local
      localStorage.clear();
      sessionStorage.clear();
      
      // 3. Força o recarregamento da página para voltar ao Login
      window.location.href = "/";
    }
  };

  const menuItems = [
    { section: 'PRINCIPAL', items: [
      { id: 'dashboard', label: 'Página principal', icon: Home },
      { id: 'atendimentos', label: 'Atendimentos', icon: Calendar },
      { id: 'agenda-online', label: 'Agenda Online', icon: Globe },
      { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
      { id: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: Repeat },
      { id: 'clientes', label: 'Clientes', icon: Users },
      { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
      { id: 'configuracoes', label: 'Configurações', icon: Settings },
    ]},
    { section: 'OPERACIONAL', items: [
      { id: 'remuneracoes', label: 'Remunerações', icon: DollarSign },
      { id: 'vendas', label: 'Vendas', icon: ShoppingCart },
      { id: 'comandas', label: 'Comandas', icon: ClipboardList },
      { id: 'caixa', label: 'Controle de Caixa', icon: Box }, 
      { id: 'servicos', label: 'Serviços', icon: Layers }, // Ajustado ícone
      { id: 'produtos', label: 'Produtos', icon: Package },
    ]}
  ];

  return (
    <aside className={`
      bg-white h-full flex flex-col border-r border-slate-200 transition-all duration-300 z-50
      ${isMobile ? 'fixed inset-y-0 left-0 w-64 shadow-2xl' : 'w-64 relative'}
    `}>
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-orange-200 shadow-lg">
          B
        </div>
        <div>
          <h1 className="font-bold text-slate-800 text-lg leading-tight">BelaApp</h1>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Studio Miqueias</p>
        </div>
        {isMobile && (
           <button onClick={onCloseMobile} className="ml-auto text-slate-400 p-2">X</button>
        )}
      </div>

      {/* Menu Scrollable */}
      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6 custom-scrollbar">
        {menuItems.map((group, idx) => (
          <div key={idx}>
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3 px-3">
              {group.section}
            </h3>
            <div className="space-y-1">
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    if (isMobile && onCloseMobile) onCloseMobile();
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${activeView === item.id 
                      ? 'bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-100' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                >
                  <item.icon size={18} strokeWidth={2} className={activeView === item.id ? 'text-orange-500' : 'text-slate-400'} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white hover:shadow-sm transition-all group cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border-2 border-white shadow-sm">
             <img src="https://github.com/miqueiasilva.png" alt="User" className="w-full h-full object-cover opacity-90 group-hover:opacity-100" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-700 truncate">Miqueias Cost...</p>
            <p className="text-xs text-slate-400 truncate">Admin</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Sair do Sistema"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
