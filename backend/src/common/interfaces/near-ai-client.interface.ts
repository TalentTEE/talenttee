export const NEAR_AI_CLIENT = 'NEAR_AI_CLIENT';

export interface NearAiClient {
  chat(params: {
    agentId: string;
    systemPrompt: string;
    userMessage: string;
    conversationHistory?: { role: string; content: string }[];
  }): Promise<{ content: string }>;
}
