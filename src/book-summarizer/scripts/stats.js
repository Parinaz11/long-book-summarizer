// Usage: node scripts/stats.js output/<book>.json
import { readFile } from 'node:fs/promises';

const out = JSON.parse(await readFile(process.argv[2], 'utf8'));
const ch = out.chapters;
const sum = (k) => ch.reduce((a, c) => a + (c.tokens?.[k] ?? 0), 0);
const attempts = ch.map((c) => c.attempts ?? 1);

console.log(`${out.book.title} | ${out.book.model} | ${ch.length} chapters`);
console.log(`repaired chapters: ${ch.filter((c) => c.repaired).length}`);
console.log(`attempts: avg ${(attempts.reduce((a, b) => a + b, 0) / ch.length).toFixed(2)}, max ${Math.max(...attempts)}`);
console.log(`chapter tokens: in ${sum('promptTokens')}, out ${sum('outputTokens')}, thinking ${sum('thinkingTokens')}`);
console.table(ch.map((c) => ({
  '#': c.index, paragraphs: c.paragraphCount, sections: c.sections.length,
  attempts: c.attempts ?? 1, repaired: c.repaired, in: c.tokens?.promptTokens, out: c.tokens?.outputTokens,
})));