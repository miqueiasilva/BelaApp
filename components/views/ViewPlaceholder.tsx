import React from 'react';
import { Construction } from 'lucide-react';

interface ViewPlaceholderProps {
  title: string;
}

const ViewPlaceholder: React.FC<ViewPlaceholderProps> = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
      <Construction className="w-16 h-16 mb-4 text-slate-400" />
      <h1 className="text-2xl font-bold text-slate-700 mb-2">{title}</h1>
      <p className="max-w-md">
        Esta funcionalidade está em desenvolvimento e estará disponível em breve. A estrutura já está pronta para a implementação das regras de negócio e integração com o banco de dados.
      </p>
    </div>
  );
};

export default ViewPlaceholder;
