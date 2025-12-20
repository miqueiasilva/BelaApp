
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalWrapperProps {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    maxWidth?: string;
    footer?: React.ReactNode;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({ 
    title, 
    children, 
    onClose, 
    maxWidth = 'max-w-lg',
    footer 
}) => {
    // Bloqueia scroll do body ao abrir
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div 
                className={`bg-white w-full ${maxWidth} rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                    {children}
                </main>

                {/* Optional Footer */}
                {footer && (
                    <footer className="px-8 py-6 border-t border-slate-100 bg-slate-50">
                        {footer}
                    </footer>
                )}
            </div>
            
            {/* Backdrop click to close */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
    );
};

export default ModalWrapper;
