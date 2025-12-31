
import React, { useState, useEffect } from 'react';
import { 
    Search, MoreVertical, Paperclip, Send, Smile, Check, CheckCheck, 
    MessageSquare, Settings, Bell, Calendar, Gift, Zap, Link as LinkIcon,
    Smartphone, QrCode, RefreshCw, LogOut, Wifi, WifiOff, BatteryCharging,
    ChevronLeft, ArrowLeft, Clock, MessageCircle, Heart, Star
} from 'lucide-react';
import { mockConversations } from '../../data/mockData';
import { ChatConversation, ChatMessage } from '../../types';
import { format } from 'date-fns';
import { ptBR as pt } from 'date-fns/locale/pt-BR';
import ToggleSwitch from '../shared/ToggleSwitch';
import Toast, { ToastType } from '../shared/Toast';

// Helper Component para o Card de Automação
const AutomationCard = ({ 
    icon: Icon, 
    title, 
    description, 
    active, 
    onToggle, 
    timeValue, 
    onTimeChange,
    hasTimeSelect = false 
}: any) => (
    <div className={`p-5 rounded-3xl border transition-all duration-300 ${active ? 'bg-white border-orange-200 shadow-md' : 'bg-slate-50 border-slate-200 opacity-80'}`}>
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl flex-shrink-0 transition-colors ${active ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <Icon size={20} />
                </div>
                <div className="space-y-1">
                    <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 flex-wrap">
                        {title}
                        {hasTimeSelect && active && (
                            <div className="relative inline-block ml-1">
                                <select 
                                    value={timeValue}
                                    onChange={(e) => onTimeChange(e.target.value)}
                                    className="appearance-none bg-orange-50 border border-orange-100 text-orange-600 px-2 py-0.5 pr-6 rounded-lg text-[10px] font-black uppercase tracking-tighter focus:ring-2 focus:ring-orange-200 outline-none cursor-pointer hover:bg-orange-100 transition-colors"
                                >
                                    <option value="1">1h antes</option>
                                    <option value="2">2h antes</option>
                                    <option value="4">4h antes</option>
                                    <option value="24">24h (1 dia)</option>
                                    <option value="48">48h (2 dias)</option>
                                </select>
                                <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none" size={10} />
                            </div>
                        )}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">{description}</p>
                </div>
            </div>
            <div className="flex-shrink-0 pt-1">
                <ToggleSwitch on={active} onClick={onToggle} />
            </div>
        </div>
    </div>
);

const ChevronDown = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m6 9 6 6 6-6"/>
    </svg>
);

const WhatsAppView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'chats' | 'automations' | 'connection'>('chats');
    const [conversations, setConversations] = useState<ChatConversation[]>(mockConversations);
    const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const activeChat = conversations.find(c => c.id === selectedChatId);

    // --- Automations State Refatorado para Tempos Personalizáveis ---
    const [automations, setAutomations] = useState({
        confirmation: { active: true, time: "24" },
        reminder: { active: true, time: "2" },
        birthday: { active: false },
        feedback: { active: true },
        recovery: { active: false }
    });

    const updateAutomation = (key: keyof typeof automations, field: 'active' | 'time', value: any) => {
        setAutomations(prev => ({
            ...prev,
            [key]: { ...prev[key], [field]: value }
        }));
        if (field === 'active') {
            showToast(`Automação ${value ? 'ativada' : 'pausada'}.`, 'info');
        }
    };

    // --- Connection State ---
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'qr_ready' | 'connected'>('connected');

    // --- Handlers ---
    const showToast = (message: string, type: ToastType = 'success') => setToast({ message, type });

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!messageInput.trim() || !selectedChatId) return;

        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text: messageInput,
            timestamp: new Date(),
            status: 'sent'
        };

        setConversations(prev => prev.map(c => {
            if (c.id === selectedChatId) {
                return {
                    ...c,
                    messages: [...c.messages, newMessage],
                    lastMessage: newMessage.text,
                    lastMessageTime: newMessage.timestamp
                };
            }
            return c;
        }));

        setMessageInput('');
    };

    const handleQuickReply = (text: string) => {
        setMessageInput(text);
    };

    return (
        <div className="flex h-full bg-slate-100 overflow-hidden relative font-sans text-left">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Sidebar (Master List) */}
            <div className={`
                ${selectedChatId !== null ? 'hidden md:flex' : 'flex w-full md:w-80'} 
                bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-20
            `}>
                {/* Sidebar Header */}
                <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white shadow-sm shadow-green-100">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <h2 className="font-black text-slate-700 tracking-tight">WhatsApp</h2>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => setActiveTab('chats')} className={`p-2 rounded-lg transition-all ${activeTab === 'chats' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`}><MessageSquare size={18} /></button>
                        <button onClick={() => setActiveTab('automations')} className={`p-2 rounded-lg transition-all ${activeTab === 'automations' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`}><Zap size={18} /></button>
                        <button onClick={() => setActiveTab('connection')} className={`p-2 rounded-lg transition-all ${activeTab === 'connection' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`}><LinkIcon size={18} /></button>
                    </div>
                </div>

                <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
                    {activeTab === 'chats' && (
                        <>
                            <div className="p-4 bg-white border-b border-slate-100 sticky top-0 z-10">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Pesquisar..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-green-100 border-transparent focus:border-green-200 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="divide-y divide-slate-100 bg-white">
                                {conversations
                                    .filter(c => c.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map(chat => (
                                    <button
                                        key={chat.id}
                                        onClick={() => setSelectedChatId(chat.id)}
                                        className={`w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-all border-b border-transparent active:bg-green-50 ${selectedChatId === chat.id ? 'bg-green-50/50 border-l-4 border-l-green-500' : ''}`}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-500 font-black overflow-hidden border-2 border-white shadow-sm">
                                            {chat.clientAvatar ? <img src={chat.clientAvatar} className="w-full h-full object-cover" alt="" /> : chat.clientName.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <h3 className="font-bold text-slate-800 truncate text-sm">{chat.clientName}</h3>
                                                <span className="text-[9px] font-black text-slate-400 uppercase">
                                                    {format(new Date(chat.lastMessageTime), 'HH:mm')}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 truncate leading-tight">{chat.lastMessage}</p>
                                        </div>
                                        {chat.unreadCount > 0 && (
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] text-white font-black flex-shrink-0">
                                                {chat.unreadCount}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                    
                    {activeTab === 'automations' && (
                        <div className="p-4 space-y-4">
                            <header className="mb-6">
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Automações JaciBot</h2>
                                <p className="text-[10px] text-slate-500 mt-1 ml-1 leading-relaxed">A IA cuida do contato enquanto você cuida da beleza.</p>
                            </header>

                            <AutomationCard 
                                icon={Calendar}
                                title={`Confirmar (${automations.confirmation.time}h antes)`}
                                description="Pergunta ao cliente se ele comparecerá ao agendamento."
                                active={automations.confirmation.active}
                                onToggle={() => updateAutomation('confirmation', 'active', !automations.confirmation.active)}
                                hasTimeSelect
                                timeValue={automations.confirmation.time}
                                onTimeChange={(val: any) => updateAutomation('confirmation', 'time', val)}
                            />

                            <AutomationCard 
                                icon={Clock}
                                title={`Lembrete (${automations.reminder.time}h antes)`}
                                description="Aviso cordial de que o horário está próximo."
                                active={automations.reminder.active}
                                onToggle={() => updateAutomation('reminder', 'active', !automations.reminder.active)}
                                hasTimeSelect
                                timeValue={automations.reminder.time}
                                onTimeChange={(val: any) => updateAutomation('reminder', 'time', val)}
                            />

                            <AutomationCard 
                                icon={Star}
                                title="Pesquisa de Satisfação"
                                description="Envia um link de avaliação 30min após o serviço."
                                active={automations.feedback.active}
                                onToggle={() => updateAutomation('feedback', 'active', !automations.feedback.active)}
                            />

                            <AutomationCard 
                                icon={Heart}
                                title="Aniversariantes"
                                description="Mensagem carinhosa with cupom de desconto."
                                active={automations.birthday.active}
                                onToggle={() => updateAutomation('birthday', 'active', !automations.birthday.active)}
                            />

                            <div className="mt-8 p-6 bg-indigo-900 rounded-[32px] text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap size={16} className="text-orange-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">IA Inteligente</span>
                                    </div>
                                    <h4 className="font-black text-sm mb-1">Recuperação de Ausentes</h4>
                                    <p className="text-[11px] text-indigo-200 leading-relaxed">Detectamos clientes sumidos há 45 dias e enviamos uma oferta automática.</p>
                                    <button className="mt-4 px-4 py-2 bg-white text-indigo-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all">Em breve</button>
                                </div>
                                <Zap className="absolute -bottom-4 -right-4 w-24 h-24 text-indigo-800 opacity-50 rotate-12" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'connection' && (
                        <div className="p-6 flex flex-col items-center justify-center h-full text-center">
                            <div className={`w-24 h-24 rounded-[40px] flex items-center justify-center shadow-2xl mb-6 border-4 border-white ${connectionStatus === 'connected' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600 animate-pulse'}`}>
                                {connectionStatus === 'connected' ? <Wifi size={40} /> : <WifiOff size={40} />}
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">
                                {connectionStatus === 'connected' ? 'WhatsApp Pareado' : 'Sem Conexão'}
                            </h3>
                            <p className="text-sm text-slate-500 mt-2 max-w-[220px]">
                                {connectionStatus === 'connected' 
                                    ? 'Seu BelaFlow está sincronizado with o dispositivo de Jaciene Félix.' 
                                    : 'Escaneie o QR Code na versão Desktop para habilitar as automações.'}
                            </p>
                            
                            {connectionStatus === 'connected' && (
                                <div className="mt-8 w-full p-4 bg-white rounded-2xl border border-slate-100 text-left">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Status da Bateria</span>
                                        <span className="text-[10px] font-black text-green-600">85%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 w-[85%]"></div>
                                    </div>
                                    <button onClick={() => setConnectionStatus('disconnected')} className="mt-6 w-full flex items-center justify-center gap-2 text-rose-500 text-xs font-black uppercase tracking-widest hover:bg-rose-50 p-3 rounded-xl transition-all">
                                        <LogOut size={16} /> Desconectar Dispositivo
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* Chat Window (Detail View) */}
            <div className={`
                flex-1 flex flex-col bg-[#f0f2f5] relative 
                ${selectedChatId === null ? 'hidden md:flex' : 'flex w-full md:w-auto'}
            `}>
                
                {selectedChatId && activeChat ? (
                    <>
                        {/* Chat Header */}
                        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0 z-10 shadow-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <button 
                                    onClick={() => setSelectedChatId(null)}
                                    className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <ArrowLeft size={24} />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-600 font-black border border-slate-100">
                                    {activeChat.clientAvatar ? <img src={activeChat.clientAvatar} className="w-full h-full object-cover rounded-full" alt="" /> : activeChat.clientName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-800 truncate text-sm">{activeChat.clientName}</h3>
                                    <p className="text-[10px] text-green-600 font-black uppercase tracking-widest leading-none mt-0.5 flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Online agora
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><Search size={20} /></button>
                                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><MoreVertical size={20} /></button>
                            </div>
                        </header>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundBlendMode: 'overlay' }}>
                            {activeChat.messages.map((msg) => (
                                <div 
                                    key={msg.id} 
                                    className={`flex ${msg.sender === 'user' || msg.sender === 'system' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-sm relative ${
                                        msg.sender === 'user' ? 'bg-[#d9fdd3] text-slate-800 rounded-tr-none border-t border-green-100 shadow-[0_2px_4px_rgba(0,0,0,0.05)]' : 
                                        msg.sender === 'system' ? 'bg-white/80 backdrop-blur-sm text-slate-700 border border-slate-200 text-xs italic w-full max-w-full my-6 rounded-2xl shadow-sm text-center' :
                                        'bg-white text-slate-800 rounded-tl-none border-t border-white shadow-[0_2px_4px_rgba(0,0,0,0.05)]'
                                    }`}>
                                        {msg.sender === 'system' && (
                                            <div className="flex items-center justify-center gap-2 mb-2 border-b border-slate-100 pb-2">
                                                <Zap size={14} className="text-orange-500" />
                                                <span className="font-black uppercase tracking-widest text-[9px]">Automação BelaFlow</span>
                                            </div>
                                        )}
                                        <p className="text-sm leading-relaxed font-medium">{msg.text}</p>
                                        <div className="flex justify-end items-center gap-1 mt-1">
                                            <span className="text-[9px] font-bold text-slate-400 opacity-70">
                                                {format(new Date(msg.timestamp), 'HH:mm')}
                                            </span>
                                            {msg.sender === 'user' && (
                                                <span className={msg.status === 'read' ? 'text-blue-500' : 'text-slate-400'}>
                                                    {msg.status === 'read' ? <CheckCheck size={14} strokeWidth={3}/> : <Check size={14} strokeWidth={3}/>}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div className="bg-white p-3 md:p-4 flex items-end gap-2 border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                            <div className="hidden sm:flex items-center gap-1">
                                <button className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all"><Smile className="w-6 h-6" /></button>
                                <button className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all"><Paperclip className="w-6 h-6" /></button>
                            </div>
                            
                            <div className="flex-1 bg-slate-100 rounded-[24px] border border-slate-200 flex flex-col overflow-hidden focus-within:ring-2 focus-within:ring-green-100 focus-within:bg-white focus-within:border-green-400 transition-all duration-300">
                                <textarea 
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                                    placeholder="Mensagem..." 
                                    className="w-full p-3 md:p-4 max-h-32 bg-transparent focus:outline-none resize-none text-sm font-bold text-slate-700"
                                    rows={1}
                                />
                                {/* Quick Replies */}
                                <div className="px-3 pb-3 flex gap-2 overflow-x-auto scrollbar-hide touch-pan-x">
                                    <button onClick={() => handleQuickReply("Olá! Gostaria de confirmar seu agendamento?")} className="text-[10px] font-black uppercase tracking-wider bg-white/60 hover:bg-green-500 hover:text-white px-3 py-2 rounded-xl whitespace-nowrap text-slate-500 transition-all border border-slate-200 shadow-sm active:scale-95">
                                        Confirmar Agenda
                                    </button>
                                    <button onClick={() => handleQuickReply("Oi! Tivemos um imprevisto, podemos adiar 15min?")} className="text-[10px] font-black uppercase tracking-wider bg-white/60 hover:bg-amber-500 hover:text-white px-3 py-2 rounded-xl whitespace-nowrap text-slate-500 transition-all border border-slate-200 shadow-sm active:scale-95">
                                        Atraso
                                    </button>
                                    <button onClick={() => handleQuickReply("Obrigada pela preferência! 🥰")} className="text-[10px] font-black uppercase tracking-wider bg-white/60 hover:bg-pink-500 hover:text-white px-3 py-2 rounded-xl whitespace-nowrap text-slate-500 transition-all border border-slate-200 shadow-sm active:scale-95">
                                        Gratidão
                                    </button>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => handleSendMessage()}
                                className="w-14 h-14 bg-green-600 text-white rounded-full hover:bg-green-700 shadow-lg shadow-green-100 transition-all active:scale-90 flex-shrink-0 flex items-center justify-center"
                            >
                                <Send className="w-6 h-6 ml-1" />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center bg-white/50 backdrop-blur-sm">
                        <div className="w-24 h-24 bg-white rounded-[40px] flex items-center justify-center shadow-2xl border border-slate-100 mb-6">
                            <MessageSquare className="w-10 h-10 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 leading-tight">Canal WhatsApp BelaFlow</h3>
                        <p className="text-xs font-bold text-slate-400 max-w-xs mt-3 uppercase tracking-widest leading-relaxed">Suas conversas sincronizadas e automatizadas em um único lugar.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsAppView;
