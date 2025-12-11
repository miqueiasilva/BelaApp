
// This is a mock service to simulate Gemini API calls.
// In a real application, you would import and use @google/genai here.

const insights = [
    "O faturamento deste mês está 15% acima da meta! Considere oferecer um bônus para a equipe.",
    "A taxa de ocupação nas terças-feiras está baixa. Sugiro criar uma promoção 'Terça em Dobro' para atrair mais clientes.",
    "Notamos que clientes que fazem 'Corte e Barba' costumam retornar a cada 25 dias. Envie um lembrete automático para agendamento.",
    "A profissional Maria Silva teve a maior média de avaliação (4.9 estrelas) este mês. Destaque-a nas redes sociais!",
];

const topicInsights: Record<string, string[]> = {
    financeiro: [
        "Divergência detectada no fechamento de caixa de ontem: R$ 15,50 a menos no PIX. Verifique os comprovantes.",
        "As despesas com 'Produtos de Limpeza' aumentaram 20% este mês. Vale a pena pesquisar novos fornecedores.",
        "Sua margem de lucro nos serviços de 'Estética' está em 45%, excelente! Foque em vender mais este item.",
        "Previsão de fluxo de caixa: Você tem R$ 2.500,00 a pagar na próxima sexta-feira. O saldo atual cobre com folga."
    ],
    agenda: [
        "A agenda de amanhã tem 3 horários vagos entre 14h e 16h. Que tal enviar uma oferta relâmpago?",
        "Hoje é sexta-feira e a agenda está 95% ocupada. Prepare a equipe para um dia movimentado!",
        "Há uma alta taxa de cancelamentos nas segundas-feiras de manhã. Considere exigir um sinal para agendamentos neste período.",
        "Jéssica Félix está com a agenda lotada pelos próximos 3 dias. Sugira outros profissionais para novos clientes."
    ],
    clientes: [
        "A cliente 'Ana Paula' não vem há 45 dias. O ciclo médio dela é de 30 dias. Envie um 'Oi, sumida!'.",
        "5 novos clientes se cadastraram essa semana vindo do Instagram. A campanha está funcionando.",
        "Temos 3 aniversariantes hoje! O sistema já preparou as mensagens de parabéns com cupom de 10%.",
        "O Ticket Médio dos clientes fidelizados é 2x maior que os eventuais. Invista no programa de fidelidade."
    ],
    marketing: [
        "O post sobre 'Botox Capilar' teve alto engajamento. Impulsione-o para atrair mais agendamentos.",
        "Sugestão de campanha: 'Semana do Amigo'. Traga um amigo e ganhe 15% de desconto.",
        "As avaliações no Google Meu Negócio subiram para 4.9. Responda os últimos comentários para manter o engajamento.",
        "Clientes que agendam pelo WhatsApp convertem 30% mais. Divulgue seu link direto nas redes."
    ]
};

const financialAlerts = [
    "Divergência detectada no fechamento de caixa de ontem: R$ 15,50 a menos no PIX. Verifique os comprovantes.",
    "O produto 'Pomada Modeladora X' está com estoque crítico (apenas 2 unidades). Recomendo fazer um novo pedido.",
    "As despesas com 'Produtos de Limpeza' aumentaram 20% este mês. Vale a pena pesquisar novos fornecedores."
];

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const simulateApiCall = <T,>(data: T, delay?: number): Promise<T> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(data);
        }, delay ?? 800 + Math.random() * 500);
    });
};

export const getDashboardInsight = async (): Promise<string> => {
    return simulateApiCall(getRandomItem(insights));
};

export const getInsightByTopic = async (topic: string): Promise<string> => {
    const list = topicInsights[topic] || insights;
    return simulateApiCall(getRandomItem(list));
};

export const getFinancialAlert = async (): Promise<string> => {
    return simulateApiCall(getRandomItem(financialAlerts));
};

export const getClientCampaignSuggestion = async (clientName: string): Promise<string> => {
    const suggestions = [
        `O último serviço de ${clientName} foi 'Coloração' há 60 dias. Sugira um retoque com 10% de desconto.`,
        `${clientName} sempre agenda 'Manicure'. Ofereça um pacote de 4 sessões com valor promocional.`,
        `É aniversário de ${clientName} na próxima semana! Envie uma mensagem com um voucher para um tratamento capilar.`,
    ];
    return simulateApiCall(getRandomItem(suggestions));
};

// --- JaciBot Stubs ---

export const suggestSmartSlots = async (date: Date): Promise<string[]> => {
    console.log(`[JaciBot] Buscando encaixes inteligentes para ${date.toISOString()}`);
    const slots = [
        "Jaciene Félix: 14:30 - 15:00 (ideal para Design Simples)",
        "Jéssica Félix: 11:20 - 12:00 (vago após Volume EGÍPCIO)",
        "Elá Priscila: 16:00 - 17:00 (encaixe para Limpeza de Pele)"
    ];
    return simulateApiCall(slots, 1200);
}

export const enqueueReminder = async (appointmentId: number, type: 'confirmacao' | 'lembrete' | 'pos' | 'aniversario' | 'retorno'): Promise<{ success: boolean; message: string }> => {
    const logMessage = `[JaciBot] Lembrete do tipo '${type}' para o agendamento #${appointmentId} foi enfileirado para envio.`;
    console.log(logMessage);
    return simulateApiCall({ success: true, message: logMessage });
}

export const autoCashClose = async (date: Date): Promise<{ totalPrevisto: number; totalRecebido: number; diferenca: number; resumo: string }> => {
    console.log(`[JaciBot] Iniciando fechamento de caixa automático para ${date.toISOString()}`);
    const result = {
        totalPrevisto: 1275.50,
        totalRecebido: 1275.50,
        diferenca: 0.00,
        resumo: "Caixa fechado com sucesso. Todos os pagamentos de atendimentos concluídos foram reconciliados."
    };
    return simulateApiCall(result, 1500);
}
