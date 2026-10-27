export function loadLLMConfig(env = process.env) {
    
  const provider = (env.LLM_PROVIDER ?? 'openrouter').toLowerCase();

  if (!['gemini', 'openrouter', 'mock'].includes(provider)) {
    throw new Error(`LLM_PROVIDER must be "gemini", "openrouter" or "mock", got "${provider}".`);
  }
  if (provider === 'mock') {
    return { provider, model: 'mock', apiKey: '', logPath: env.USAGE_LOG ?? '.state/usage.jsonl' };
  }

  const structuredMode = (env.STRUCTURED_MODE ?? 'json_schema').toLowerCase();
  if (!['json_schema', 'json_object', 'prompt'].includes(structuredMode)) {
    throw new Error('STRUCTURED_MODE must be json_schema, json_object or prompt.');
  }

  const apiKey = provider === 'gemini' ? env.GEMINI_API_KEY : env.OPENROUTER_API_KEY;
  const missing = [];
  if (!env.LLM_MODEL) missing.push('LLM_MODEL');
  if (!apiKey) missing.push(provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENROUTER_API_KEY');
  if (missing.length) {
    throw new Error(`Missing in .env: ${missing.join(', ')} (copy .env.example to .env).`);
  }
    return { provider, model: env.LLM_MODEL, apiKey, structuredMode, logPath: env.USAGE_LOG ?? '.state/usage.jsonl' };
}