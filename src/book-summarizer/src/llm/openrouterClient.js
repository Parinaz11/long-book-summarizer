import OpenAI from 'openai';
import { estimateTokens } from './tokens.js';
import { extractJson } from './json.js';

const FINISH = { stop: 'STOP', length: 'MAX_TOKENS', content_filter: 'SAFETY' };

export function createOpenRouterClient({ apiKey, model, structuredMode = 'json_schema' }) {
//   const client = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey });
  // const client = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey, maxRetries: 5 });
  const client = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey, maxRetries: 0 });
  return {
    provider: 'openrouter',
    model,
    async countTokens(text) {
      return estimateTokens(text);
    },
    async generate({ system, prompt, jsonSchema, maxOutputTokens = 8192, temperature = 0.2 }) {
      const extra = {};
      let finalPrompt = prompt;

      if (jsonSchema) {
        if (structuredMode === 'json_schema') {
          extra.response_format = {
            type: 'json_schema',
            json_schema: { name: 'result', strict: true, schema: jsonSchema },
          };
          extra.provider = { require_parameters: true };
        } else {
          if (structuredMode === 'json_object') {
            extra.response_format = { type: 'json_object' };
          }
          // Both fallback modes: describe the schema in the prompt instead.
          finalPrompt +=
            '\n\nRespond with ONLY a valid JSON object (no markdown, no commentary) ' +
            `that matches this JSON Schema:\n${JSON.stringify(jsonSchema)}`;
        }
      }

      const messages = [];
      if (system) messages.push({ role: 'system', content: system });
      messages.push({ role: 'user', content: finalPrompt });

      const res = await client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxOutputTokens,
        ...extra,
      });

      const choice = res.choices?.[0];
      const u = res.usage ?? {};
      const raw = choice?.finish_reason;
      let text = choice?.message?.content ?? '';
      if (jsonSchema && structuredMode !== 'json_schema') text = extractJson(text);

      return {
        text,
        finishReason: FINISH[raw] ?? String(raw ?? 'UNKNOWN').toUpperCase(),
        usage: {
          promptTokens: u.prompt_tokens ?? 0,
          outputTokens: u.completion_tokens ?? 0, // includes thinking tokens here
          thinkingTokens: u.completion_tokens_details?.reasoning_tokens ?? 0,
          totalTokens: u.total_tokens ?? 0,
        },
      };
    },
  };
}