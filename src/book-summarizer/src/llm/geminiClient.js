import { GoogleGenAI } from '@google/genai';

export function createGeminiClient({ apiKey, model }) {
  const ai = new GoogleGenAI({ apiKey });
  return {
    provider: 'gemini',
    model,
    async countTokens(text) {
      const r = await ai.models.countTokens({ model, contents: text });
      return r.totalTokens;
    },
    async generate({ system, prompt, jsonSchema, maxOutputTokens = 8192, temperature = 0.2 }) {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: system,
          temperature,
          maxOutputTokens,
          ...(jsonSchema
            ? { responseMimeType: 'application/json', responseJsonSchema: jsonSchema }
            : {}),
        },
      });
      const u = response.usageMetadata ?? {};
      return {
        text: response.text ?? '',
        finishReason: response.candidates?.[0]?.finishReason ?? 'UNKNOWN',
        usage: {
          promptTokens: u.promptTokenCount ?? 0,
          outputTokens: u.candidatesTokenCount ?? 0,
          thinkingTokens: u.thoughtsTokenCount ?? 0,
          totalTokens: u.totalTokenCount ?? 0,
        },
      };
    },
  };
}