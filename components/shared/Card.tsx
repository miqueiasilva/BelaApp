
import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', icon }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-5 sm:p-6 ${className}`}>
      {title && (
        <div className="flex items-center gap-3 mb-4">
          {icon && <div className="text-cyan-500">{icon}</div>}
          <h3 className="text-base font-semibold text-slate-600">{title}</h3>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};

export default Card;
