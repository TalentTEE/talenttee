import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { NearAiClient } from '../common/interfaces/near-ai-client.interface.js';

@Injectable()
export class NearAiCloudClient implements NearAiClient {
  private readonly logger = new Logger(NearAiCloudClient.name);
  private readonly client: OpenAI;
  private readonly chatModel: string;
  private readonly embedModel: string;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      baseURL: config.get<string>('NEAR_AI_BASE_URL', 'https://cloud-api.near.ai/v1'),
      apiKey: config.get<string>('NEAR_AI_API_KEY', ''),
    });
    this.chatModel = config.get<string>('NEAR_AI_CHAT_MODEL', 'Qwen/Qwen3.5-122B-A10B');
    this.embedModel = config.get<string>('NEAR_AI_EMBED_MODEL', 'Qwen/Qwen3-Embedding-0.6B');
  }

  async chat(params: {
    agentId: string;
    systemPrompt: string;
    userMessage: string;
    conversationHistory?: { role: string; content: string }[];
  }): Promise<{ content: string }> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: params.systemPrompt },
    ];

    if (params.conversationHistory) {
      for (const msg of params.conversationHistory) {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    messages.push({ role: 'user', content: params.userMessage });

    const response = await this.client.chat.completions.create({
      model: this.chatModel,
      messages,
    });

    const content = response.choices[0]?.message?.content ?? '';
    return { content };
  }

  async embed(input: string | string[]): Promise<number[][]> {
    const inputs = Array.isArray(input) ? input : [input];

    const response = await this.client.embeddings.create({
      model: this.embedModel,
      input: inputs,
    });

    return response.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }

  async rerank(
    query: string,
    documents: string[],
    topN?: number,
  ): Promise<{ index: number; score: number }[]> {
    const limit = topN ?? documents.length;

    // Chat-based rerank fallback: ask LLM to score relevance
    const docList = documents
      .map((doc, i) => `[${i}] ${doc}`)
      .join('\n');

    const prompt = `You are a relevance scorer. Given a query and a list of documents, score each document's relevance to the query from 0.0 to 1.0.

Query: ${query}

Documents:
${docList}

Respond ONLY with a JSON array of objects, each with "index" (number) and "score" (number 0.0-1.0). Example: [{"index":0,"score":0.9},{"index":1,"score":0.3}]`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.chatModel,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = response.choices[0]?.message?.content ?? '[]';
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found in response');

      const results: { index: number; score: number }[] = JSON.parse(jsonMatch[0]);
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      this.logger.warn('Batch rerank parse failed, falling back to sequential scoring', error);
      return this.sequentialRerank(query, documents, limit);
    }
  }

  private async sequentialRerank(
    query: string,
    documents: string[],
    limit: number,
  ): Promise<{ index: number; score: number }[]> {
    const results: { index: number; score: number }[] = [];

    for (let i = 0; i < documents.length; i++) {
      const prompt = `Rate the relevance of this document to the query on a scale of 0.0 to 1.0. Respond with ONLY a number.

Query: ${query}
Document: ${documents[i]}`;

      try {
        const response = await this.client.chat.completions.create({
          model: this.chatModel,
          messages: [{ role: 'user', content: prompt }],
        });

        const raw = response.choices[0]?.message?.content ?? '0';
        const score = parseFloat(raw.trim()) || 0;
        results.push({ index: i, score: Math.min(1, Math.max(0, score)) });
      } catch {
        results.push({ index: i, score: 0 });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
