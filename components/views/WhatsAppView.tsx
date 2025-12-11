
import React, { useState } from 'react';
import { 
    Search, MoreVertical, Paperclip, Send, Smile, Check, CheckCheck, 
    MessageSquare, Settings, Bell, Calendar, Gift, Zap
} from 'lucide-react';
import { mockConversations, clients } from '../../data/mockData';
import { ChatConversation, ChatMessage } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ToggleSwitch from '../shared/ToggleSwitch';

const WhatsAppView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'chats' | 'automations'>('chats');
    const [conversations, setConversations] = useState<ChatConversation[]>(mockConversations);
    const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const activeChat = conversations.find(c => c.id === selectedChatId);

    // --- Automations State ---
    const [automations, setAutomations] = useState({
        confirm24h: true,
        remind2h: true,
        birthday: false,
        feedback: true,
        recovery: false
    });

    // --- Handlers ---

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
        // Scroll to bottom logic would go here
    };

    const handleQuickReply = (text: string) => {
        setMessageInput(text);
    };

    const toggleAutomation = (key: keyof typeof automations) => {
        setAutomations(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // --- Render ---

    return (
        <div className="flex h-full bg-slate-100 overflow-hidden">
            {/* Sidebar (Left) */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
                {/* Sidebar Header */}
                <div className="h-16 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <h2 className="font-bold text-slate-700">WhatsApp</h2>
                    </div>
                    <div className="flex gap-1">
                        <button 
                            onClick={() => setActiveTab('chats')} 
                            className={`p-2 rounded-lg transition ${activeTab === 'chats' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                            title="Conversas"
                        >
                            <MessageSquare className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => setActiveTab('automations')} 
                            className={`p-2 rounded-lg transition ${activeTab === 'automations' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                            title="Automações JaciBot"
                        >
                            <Zap className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {activeTab === 'chats' ? (
                    <>
                        {/* Search */}
                        <div className="p-3 border-b border-slate-100 bg-white">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar conversa..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                                />
                            </div>
                        </div>

                        {/* Conversation List */}
                        <div className="flex-1 overflow-y-auto">
                            {conversations
                                .filter(c => c.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(chat => (
                                <button
                                    key={chat.id}
                                    onClick={() => setSelectedChatId(chat.id)}
                                    className={`w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition border-b border-slate-50 ${selectedChatId === chat.id ? 'bg-green-50 hover:bg-green-50' : ''}`}
                                >
                                    <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-500 font-bold text-lg overflow-hidden">
                                        {chat.clientAvatar ? <img src={chat.clientAvatar} alt="" /> : chat.clientName.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-semibold text-slate-800 truncate">{chat.clientName}</h3>
                                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                                                {format(new Date(chat.lastMessageTime), 'HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 truncate">{chat.lastMessage}</p>
                                    </div>
                                    {chat.unreadCount > 0 && (
                                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
                                            {chat.unreadCount}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    /* Automations Sidebar List (Could be simplified or detailed) */
                    <div className="p-4 space-y-4">
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                            <h3 className="font-bold text-orange-800 text-sm mb-2 flex items-center gap-2">
                                <Zap className="w-4 h-4"/> JaciBot Ativo
                            </h3>
                            <p className="text-xs text-orange-700">
                                O JaciBot está monitorando sua agenda e enviará mensagens automaticamente conforme configurado.
                            </p>
                        </div>
                        <div className="text-sm text-slate-500">
                            Selecione uma categoria de automação ao lado para configurar.
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-[#e5ddd5] relative">
                {activeTab === 'chats' ? (
                    selectedChatId && activeChat ? (
                        <>
                            {/* Chat Header */}
                            <header className="h-16 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0 z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                        {activeChat.clientName.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{activeChat.clientName}</h3>
                                        <p className="text-xs text-slate-500">
                                            {activeChat.tags?.join(', ') || 'Cliente'}
                                        </p>
                                    </div>
                                </div>
                                <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </header>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat' }}>
                                {activeChat.messages.map((msg) => (
                                    <div 
                                        key={msg.id} 
                                        className={`flex ${msg.sender === 'user' || msg.sender === 'system' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[70%] rounded-lg p-3 shadow-sm relative ${
                                            msg.sender === 'user' ? 'bg-[#d9fdd3] text-slate-800 rounded-tr-none' : 
                                            msg.sender === 'system' ? 'bg-yellow-50 text-slate-600 border border-yellow-100 text-xs text-center italic w-full max-w-[90%] self-center' :
                                            'bg-white text-slate-800 rounded-tl-none'
                                        }`}>
                                            {msg.sender === 'system' && <span className="block font-bold mb-1 not-italic">🤖 JaciBot:</span>}
                                            <p className="text-sm leading-relaxed">{msg.text}</p>
                                            <div className="flex justify-end items-center gap-1 mt-1">
                                                <span className="text-[10px] text-slate-400">
                                                    {format(new Date(msg.timestamp), 'HH:mm')}
                                                </span>
                                                {msg.sender === 'user' && (
                                                    <span className={msg.status === 'read' ? 'text-blue-500' : 'text-slate-400'}>
                                                        {msg.status === 'read' ? <CheckCheck size={14}/> : <Check size={14}/>}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Input Area */}
                            <div className="bg-slate-50 p-3 flex items-end gap-2 border-t border-slate-200">
                                <button className="p-2 text-slate-500 hover:bg-slate-200 rounded-full">
                                    <Smile className="w-6 h-6" />
                                </button>
                                <button className="p-2 text-slate-500 hover:bg-slate-200 rounded-full">
                                    <Paperclip className="w-6 h-6" />
                                </button>
                                <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col">
                                    <textarea 
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                                        placeholder="Digite uma mensagem" 
                                        className="w-full p-3 max-h-32 bg-transparent focus:outline-none resize-none text-sm"
                                        rows={1}
                                    />
                                    {/* Quick Replies / Templates */}
                                    <div className="px-2 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
                                        <button onClick={() => handleQuickReply("Olá! Gostaria de confirmar seu agendamento?")} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-full whitespace-nowrap text-slate-600">
                                            Confirmar Agenda
                                        </button>
                                        <button onClick={() => handleQuickReply("Oi! Tudo bem? Já chegamos no seu horário.")} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-full whitespace-nowrap text-slate-600">
                                            Atraso
                                        </button>
                                        <button onClick={() => handleQuickReply("Obrigada pela preferência! 🥰")} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-full whitespace-nowrap text-slate-600">
                                            Agradecimento
                                        </button>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleSendMessage()}
                                    className="p-3 bg-green-600 text-white rounded-full hover:bg-green-700 shadow-md transition-transform active:scale-95"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
                            <MessageSquare className="w-16 h-16 mb-4" />
                            <p>Selecione uma conversa para iniciar</p>
                        </div>
                    )
                ) : (
                    // --- AUTOMATIONS VIEW ---
                    <div className="h-full bg-slate-50 overflow-y-auto p-8">
                        <div className="max-w-3xl mx-auto space-y-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-orange-100 rounded-full text-orange-600">
                                    <Zap className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">Automações do JaciBot</h2>
                                    <p className="text-slate-500">Configure as mensagens automáticas que o sistema enviará para seus clientes.</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6 border-b border-slate-100">
                                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-blue-500" />
                                        Agenda e Lembretes
                                    </h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    <div className="p-6 flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-800">Confirmação (24h antes)</p>
                                            <p className="text-sm text-slate-500 max-w-md">Envia uma mensagem pedindo confirmação do horário um dia antes.</p>
                                        </div>
                                        <ToggleSwitch on={automations.confirm24h} onClick={() => toggleAutomation('confirm24h')} />
                                    </div>
                                    <div className="p-6 flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-800">Lembrete (2h antes)</p>
                                            <p className="text-sm text-slate-500 max-w-md">Envia um lembrete rápido para o cliente não esquecer.</p>
                                        </div>
                                        <ToggleSwitch on={automations.remind2h} onClick={() => toggleAutomation('remind2h')} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6 border-b border-slate-100">
                                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                        <Gift className="w-5 h-5 text-pink-500" />
                                        Relacionamento
                                    </h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    <div className="p-6 flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-800">Feliz Aniversário</p>
                                            <p className="text-sm text-slate-500 max-w-md">Envia uma mensagem de parabéns com um cupom de desconto.</p>
                                        </div>
                                        <ToggleSwitch on={automations.birthday} onClick={() => toggleAutomation('birthday')} />
                                    </div>
                                    <div className="p-6 flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-800">Feedback Pós-Atendimento</p>
                                            <p className="text-sm text-slate-500 max-w-md">Pergunta a nota do serviço 1h após a conclusão.</p>
                                        </div>
                                        <ToggleSwitch on={automations.feedback} onClick={() => toggleAutomation('feedback')} />
                                    </div>
                                     <div className="p-6 flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-800">Recuperação de Inativos</p>
                                            <p className="text-sm text-slate-500 max-w-md">Envia uma oferta para clientes que não voltam há mais de 30 dias.</p>
                                        </div>
                                        <ToggleSwitch on={automations.recovery} onClick={() => toggleAutomation('recovery')} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsAppView;
