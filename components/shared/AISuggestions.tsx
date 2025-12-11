
import React from 'react';
import { Sparkles } from 'lucide-react';

const suggestions = [
  { text: 'AI Features', icon: <Sparkles className="w-4 h-4" /> },
  { text: 'Adicionar filtros de data' },
  { text: 'Exibir total de clientes' },
  { text: 'Refinar status do agendamento' },
  { text: 'Integrar JaciBot ao Dashboard' },
  { text: 'Agendamento responsivo' },
];

const AISuggestions: React.FC = () => {
  const handleSuggestionClick = (suggestionText: string) => {
    alert(`Funcionalidade sugerida: "${suggestionText}". Em breve!`);
  };

  return (
    <div className="text-center py-4">
      <h3 className="text-xs text-slate-500 mb-3 tracking-wide">sugestões abaixo</h3>
      <div className="flex flex-wrap justify-center items-center gap-3 px-4">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleSuggestionClick(suggestion.text)}
            className="px-4 py-2 text-sm font-medium rounded-full transition-colors border shadow-sm flex items-center gap-2 bg-white border-slate-300 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            {suggestion.icon && <span className="text-blue-500">{suggestion.icon}</span>}
            <span>{suggestion.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AISuggestions;
