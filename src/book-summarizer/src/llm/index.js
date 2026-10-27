import { loadLLMConfig } from '../config.js';
import { createGeminiClient } from './geminiClient.js';
import { createOpenRouterClient } from './openrouterClient.js';
import { withUsageLogging } from './usageLog.js';
import { createMockClient } from './mockClient.js';

import { withRetry } from './retry.js';

export function createLLM(env = process.env) {
  const cfg = loadLLMConfig(env);
//   const base = cfg.provider === 'gemini' ? createGeminiClient(cfg) : createOpenRouterClient(cfg);

  const base =
    cfg.provider === 'gemini' ? createGeminiClient(cfg)
    : cfg.provider === 'openrouter' ? createOpenRouterClient(cfg)
    : createMockClient();
  return withRetry(withUsageLogging(base, cfg.logPath));
}