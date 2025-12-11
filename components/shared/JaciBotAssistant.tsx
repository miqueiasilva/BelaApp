
import React, { useState, useEffect } from 'react';
import { Sparkles, DollarSign, Calendar, Users, Megaphone, RefreshCw } from 'lucide-react';
import { getInsightByTopic } from '../../services/geminiService';

interface JaciBotAssistantProps {
    fetchInsight: () => Promise<string>;
}

const topics = [
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
];

const JaciBotAssistant: React.FC<JaciBotAssistantProps> = ({ fetchInsight }) => {
    const [insight, setInsight] = useState('Analisando dados em tempo real...');
    const [loading, setLoading] = useState(true);
    const [activeTopic, setActiveTopic] = useState<string | null>(null);

    const loadInsight = async (topic?: string) => {
        setLoading(true);
        setActiveTopic(topic || null);
        try {
            const newInsight = topic 
                ? await getInsightByTopic(topic)
                : await fetchInsight();
            setInsight(newInsight);
        } catch (error) {
            setInsight("Desculpe, não consegui processar essa informação agora.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInsight();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchInsight]);

    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            {/* Background Effects */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full filter blur-3xl"></div>
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-teal-500/10 rounded-full filter blur-3xl"></div>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-400/20 rounded-full flex items-center justify-center border-2 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                        <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg leading-tight">JaciBot AI</h4>
                        <p className="text-[10px] text-cyan-300 font-medium tracking-wide uppercase">Assistente Inteligente</p>
                    </div>
                </div>
                <button 
                    onClick={() => loadInsight(activeTopic || undefined)} 
                    disabled={loading}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white disabled:opacity-50"
                    title="Novo Insight"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Content Area */}
            <div className="relative z-10 flex-1 mb-4">
                {loading ? (
                    <div className="space-y-2 mt-2">
                        <div className="h-4 bg-slate-600/50 rounded w-3/4 animate-pulse"></div>
                        <div className="h-4 bg-slate-600/50 rounded w-full animate-pulse"></div>
                        <div className="h-4 bg-slate-600/50 rounded w-5/6 animate-pulse"></div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <p className="text-slate-200 text-sm leading-relaxed font-light">
                            "{insight}"
                        </p>
                    </div>
                )}
            </div>

            {/* Action Chips */}
            <div className="relative z-10">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-2 tracking-wider">Solicitar análise sobre:</p>
                <div className="flex flex-wrap gap-2">
                    {topics.map((topic) => (
                        <button
                            key={topic.id}
                            onClick={() => loadInsight(topic.id)}
                            disabled={loading}
                            className={`
                                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border
                                ${activeTopic === topic.id 
                                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]' 
                                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-white'
                                }
                            `}
                        >
                            <topic.icon size={12} />
                            {topic.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default JaciBotAssistant;
