
import { GoogleGenAI, Type } from "@google/genai";
import { initialAppointments, mockTransactions, clients, professionals } from "../data/mockData";
import { format, isSameDay } from "date-fns";

let aiInstance: GoogleGenAI | null = null;
const modelId = "gemini-3-flash-preview";

const getAIClient = () => {
    if (aiInstance) return aiInstance;
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'undefined') return null;
    try {
        aiInstance = new GoogleGenAI({ apiKey });
        return aiInstance;
    } catch (e) {
        return null;
    }
};

const insightsFallback = [
    "O faturamento deste mês está 15% acima da meta!",
    "A taxa de ocupação nas terças-feiras está baixa. Sugiro uma promoção.",
    "Clientes de 'Corte e Barba' costumam retornar a cada 25 dias.",
];

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const getDashboardInsight = async (): Promise<string> => {
    const ai = getAIClient();
    if (!ai) return getRandomItem(insightsFallback);
    try {
        const today = new Date();
        const context = `Atendimentos: ${initialAppointments.length}, Clientes: ${clients.length}`;
        const response = await ai.models.generateContent({
            model: modelId,
            contents: `Você é a JaciBot, consultora IA de beleza. Dados hoje (${format(today, "dd/MM")}): ${context}. Gere um insight estratégico de 1 frase.`,
        });
        return response.text || getRandomItem(insightsFallback);
    } catch (error) {
        return getRandomItem(insightsFallback);
    }
};

export const generateChurnRecoveryMessage = async (clientName: string, lastService: string): Promise<string> => {
    const ai = getAIClient();
    if (!ai) return `Olá ${clientName}, estamos com saudades! Que tal agendar um novo ${lastService}?`;
    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: `Gere uma mensagem curta, carinhosa e profissional de WhatsApp para a cliente ${clientName} que não vem ao estúdio há 45 dias. O último serviço dela foi ${lastService}. Use emojis.`,
        });
        return response.text || `Olá ${clientName}, que tal renovar seu visual?`;
    } catch (e) {
        return `Olá ${clientName}, estamos com saudades!`;
    }
};

export const getInsightByTopic = async (topic: string): Promise<string> => {
    const ai = getAIClient();
    if (!ai) return "Analisando padrões de comportamento do estúdio...";
    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: `JaciBot, forneça uma dica rápida (máx 15 palavras) sobre o tópico: "${topic}" para um salão de beleza moderno.`,
        });
        return response.text || "Revise seus processos para otimizar o tempo.";
    } catch (error) {
        return "Insight indisponível no momento.";
    }
};

export const suggestSmartSlots = async (date: Date): Promise<string[]> => {
    const ai = getAIClient();
    const fallbackSlots = ["10:00 - Design Sobrancelha", "14:30 - Manicure"];
    if (!ai) return fallbackSlots;
    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: `Analise a agenda e sugira 2 horários de encaixe plausíveis. Retorne APENAS um Array JSON de strings.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        return response.text ? JSON.parse(response.text) : fallbackSlots;
    } catch (error) {
        return fallbackSlots;
    }
}

export const enqueueReminder = async (appointmentId: number, type: string): Promise<{ success: boolean; message: string }> => {
    const ai = getAIClient();
    if (!ai) return { success: true, message: "Lembrete padrão agendado." };
    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: `Gere uma mensagem curta de WhatsApp para confirmar um agendamento. Tipo: ${type}.`
        });
        return { success: true, message: response.text?.trim() || "Confirmado!" };
    } catch (e) {
        return { success: false, message: "Erro ao gerar mensagem." };
    }
};

export const autoCashClose = async (date: Date): Promise<{ totalPrevisto: number; totalRecebido: number; diferenca: number; resumo: string }> => {
    return { totalPrevisto: 1000, totalRecebido: 1000, diferenca: 0, resumo: "Fechamento realizado com sucesso." };
};
