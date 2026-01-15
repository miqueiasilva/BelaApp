
import React, { useState } from 'react';
import AdminDashboard from '../admin/AdminDashboard';
import JaciBotPanel from '../JaciBotPanel';
import { Sparkles } from 'lucide-react';
import { FinancialTransaction } from '../../types';

interface AtendimentosViewProps {
  onAddTransaction: (t: FinancialTransaction) => void;
  onNavigateToCommand?: (id: string) => void;
}

const AtendimentosView: React.FC<AtendimentosViewProps> = ({ onAddTransaction, onNavigateToCommand }) => {
  const [isJaciBotOpen, setIsJaciBotOpen] = useState(false);

  return (
    <div className="h-full relative">
      <AdminDashboard />
      
      {/* Botão flutuante JaciBot */}
      <button 
        onClick={() => setIsJaciBotOpen(true)}
        className="fixed bottom-6 right-24 w-14 h-14 bg-white border-2 border-orange-500 rounded-full shadow-lg flex items-center justify-center text-orange-500 hover:bg-orange-50 transition-all z-20 group"
      >
        <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span className="absolute -top-12 right-0 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Assistente JaciBot
        </span>
      </button>

      <JaciBotPanel isOpen={isJaciBotOpen} onClose={() => setIsJaciBotOpen(false)} />
    </div>
  );
};

export default AtendimentosView;
