// Rough estimate: ~4 characters per token for English.
// Persian needs MORE tokens per character, so this undercounts it.
export function estimateTokens(text, languageOrCharsPerToken = 'en') {
  const charsPerToken = typeof languageOrCharsPerToken === 'number'
    ? languageOrCharsPerToken
    : languageOrCharsPerToken === 'fa' ? 2.75 : 4;
  return Math.ceil(text.length / charsPerToken);
}

export function emptyUsage() {
  return { promptTokens: 0, outputTokens: 0, thinkingTokens: 0, totalTokens: 0 };
}

export function addUsage(total, usage = {}) {
  for (const k of Object.keys(total)) total[k] += usage[k] ?? 0;
  return total;
}



// // Rough estimate: ~4 characters per token for English.
// // Non-Latin scripts (e.g. Persian) usually need MORE tokens per character,
// // so for those, later use the provider's exact token counter.
// export function estimateTokens(text, charsPerToken = 4) {
//   return Math.ceil(text.length / charsPerToken);
// }