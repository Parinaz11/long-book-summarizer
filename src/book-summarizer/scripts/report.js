import { readFile } from 'node:fs/promises';
import { estimateCost, pricingFromEnv } from '../src/pricing.js';

const [outputPath, ...args] = process.argv.slice(2);
if (!outputPath) throw new Error('Usage: node scripts/report.js output/<book>.json [--usage path]');
const usagePath = args[args.indexOf('--usage') + 1] ?? '.state/usage.jsonl';
const output = JSON.parse(await readFile(outputPath, 'utf8'));
const pricing = pricingFromEnv();
const lines = (await readFile(usagePath, 'utf8').catch(() => '')).trim().split('\n').filter(Boolean);
const records = lines.map((line) => JSON.parse(line)).filter((entry) =>
  entry.book === output.book.title && (!output.book.runId || entry.runId === output.book.runId));
if (records.length === 0) {
  throw new Error(`No usage records found for book "${output.book.title}"${output.book.runId ? ` and runId "${output.book.runId}"` : ''}.`);
}
const totals = records.reduce((sum, entry) => {
  for (const key of ['promptTokens', 'outputTokens', 'thinkingTokens', 'totalTokens']) sum[key] += entry[key] ?? 0;
  return sum;
}, { promptTokens: 0, outputTokens: 0, thinkingTokens: 0, totalTokens: 0 });
const byStep = Object.fromEntries([...new Set(records.map((entry) => entry.step ?? 'unknown'))].map((step) => [
  step, records.filter((entry) => (entry.step ?? 'unknown') === step).reduce((sum, entry) => {
    for (const key of ['promptTokens', 'outputTokens', 'thinkingTokens', 'totalTokens']) sum[key] += entry[key] ?? 0;
    return sum;
  }, { promptTokens: 0, outputTokens: 0, thinkingTokens: 0, totalTokens: 0 }),
]));
console.log(JSON.stringify({
  book: output.book.title, usageRecords: records.length, pricingUsdPerMillion: pricing,
  totals, byStep, estimatedCostUsd: estimateCost(totals, pricing),
}, null, 2));
