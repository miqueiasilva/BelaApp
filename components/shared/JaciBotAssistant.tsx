
import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface JaciBotAssistantProps {
    fetchInsight: () => Promise<string>;
}

const JaciBotAssistant: React.FC<JaciBotAssistantProps> = ({ fetchInsight }) => {
    const [insight, setInsight] = useState('Analisando dados em tempo real...');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadInsight = async () => {
            setLoading(true);
            const newInsight = await fetchInsight();
            setInsight(newInsight);
            setLoading(false);
        };
        loadInsight();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchInsight]);

    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full filter blur-3xl"></div>
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-teal-500/10 rounded-full filter blur-3xl"></div>
            
            <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-10 h-10 bg-cyan-400/20 rounded-full flex items-center justify-center border-2 border-cyan-500/50">
                    <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
                <div>
                    <h4 className="font-bold text-lg">JaciBot Assistente</h4>
                    <p className="text-xs text-cyan-300">Inteligência Artificial Ativa</p>
                </div>
            </div>
            <div className="relative z-10">
                {loading ? (
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                    </div>
                ) : (
                    <p className="text-slate-200 text-sm leading-relaxed">{insight}</p>
                )}
            </div>
        </div>
    );
};

export default JaciBotAssistant;
