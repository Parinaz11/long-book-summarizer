export function pricingFromEnv(env = process.env) {
  if (!String(env.LLM_INPUT_PRICE ?? '').trim() || !String(env.LLM_OUTPUT_PRICE ?? '').trim()) {
    throw new Error('Pricing is not configured. Set LLM_INPUT_PRICE and LLM_OUTPUT_PRICE (USD per million tokens).');
  }
  const input = Number(env.LLM_INPUT_PRICE);
  const output = Number(env.LLM_OUTPUT_PRICE);
  if (!Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) {
    throw new Error('Pricing is not configured. Set LLM_INPUT_PRICE and LLM_OUTPUT_PRICE (USD per million tokens).');
  }
  return { input, output };
}

export function estimateCost(usage = {}, pricing) {
  if (!pricing) throw new Error('Pricing is required to estimate cost.');
  return ((usage.promptTokens ?? 0) * pricing.input + (usage.outputTokens ?? 0) * pricing.output) / 1_000_000;
}
