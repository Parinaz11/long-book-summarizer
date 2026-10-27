import { parseArgs } from 'node:util';
import { basename, extname } from 'node:path';
import { loadBook } from './extract/loadBook.js';
import { detectChapters, assertCoverage } from './structure/detectChapters.js';
import { chapterParagraphs } from './structure/paragraphs.js';
import { estimateTokens } from './llm/tokens.js';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    title: { type: 'string' },
    limit: { type: 'string' },
    force: { type: 'boolean', default: false },
    maxChunkTokens: { type: 'string' },
  },
});
const [cmd, file, ...rest] = positionals;

async function inspect() {
  const { text, language, warnings } = await loadBook(file);
  const result = detectChapters(text);
  console.table(
    result.chapters.map((c) => ({
      '#': c.index,
      heading: c.label,
      chars: c.chars,
      '~tokens': estimateTokens(text.slice(c.start, c.end), language),
    })),
  );
  console.log(`Language: ${language}`);
  console.log(`Total: ${text.length} chars, ~${estimateTokens(text, language)} tokens, ${result.chapters.length} chapters`);
  for (const w of [...warnings, ...result.warnings]) console.warn('WARNING:', w);
  if (result.chapters.length) {
    assertCoverage(text, result);
    console.log('Coverage check passed.');
  }
}

// Prints paragraphs of one chapter so you can compare them with a section summary.
// Usage: node src/cli.js show <book.txt> <chapter> <fromParagraph> <toParagraph>
async function show() {
  const [chapterNo, from, to] = rest.map(Number);
  const { text } = await loadBook(file);
  const { chapters } = detectChapters(text);
  const chapter = chapters[chapterNo - 1];
  if (!chapter) throw new Error(`No chapter ${chapterNo} (the book has ${chapters.length}).`);
  const paras = chapterParagraphs(text, chapter);
  const start = from || 1;
  const end = to || paras.length;
  paras.slice(start - 1, end).forEach((p, i) => console.log(`[P${start + i}] ${p}\n`));
}

async function summarize() {
  const { createLLM } = await import('./llm/index.js'); // only needed here, so inspect works without .env
  const { runPipeline } = await import('./pipeline.js');
  const limit = values.limit ? Number(values.limit) : undefined;
  const maxChunkTokens = values.maxChunkTokens ? Number(values.maxChunkTokens) : undefined;
  if (maxChunkTokens !== undefined && (!Number.isInteger(maxChunkTokens) || maxChunkTokens < 1)) {
    throw new Error('--maxChunkTokens must be a positive whole number.');
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error('--limit must be a positive whole number.');
  }
  await runPipeline({
    filePath: file,
    title: values.title ?? basename(file, extname(file)),
    limit,
    force: values.force,
    llm: createLLM(),
    onEvent: (event) => {
      if (event.type === 'chapter_started') console.log(`Starting chapter ${event.chapter}...`);
      else if (event.type === 'chapter_done') console.log(`Completed chapter ${event.chapter} (${event.tokens.totalTokens ?? 0} tokens).`);
      else if (event.type === 'run_started') console.log('Run started.');
      else if (event.type === 'run_done') console.log('Run completed.');
      else if (event.type === 'error') console.error(`Pipeline error: ${event.message}`);
    },
    ...(maxChunkTokens ? { maxChunkTokens } : {}),
  });
}

const COMMANDS = { inspect, summarize, show };

try {
  if (!file || !COMMANDS[cmd]) {
    console.error(
      'Usage:\n' +
        '  node src/cli.js inspect <book.txt>\n' +
        '  node src/cli.js summarize <book.txt> [--title "..."] [--limit N] [--maxChunkTokens N] [--force]\n' +
        '  node src/cli.js show <book.txt> <chapter> <fromParagraph> <toParagraph>',
    );
    process.exitCode = 1;
  } else {
    await COMMANDS[cmd]();
  }
} catch (err) {
  console.error('ERROR:', err.message);
  process.exitCode = 1;
}




// import { readFile } from 'node:fs/promises';
// import { cleanGutenberg } from './extract/text.js';
// import { detectChapters, assertCoverage } from './structure/detectChapters.js';
// import { estimateTokens } from './llm/tokens.js';

// const [cmd, file] = process.argv.slice(2);
// if (cmd !== 'inspect' || !file) {
//   console.error('Usage: node src/cli.js inspect <book.txt>');
//   process.exit(1);
// }

// const raw = await readFile(file, 'utf8');
// const { text, warnings: cleanWarnings } = cleanGutenberg(raw);
// const result = detectChapters(text);

// console.table(
//   result.chapters.map((c) => ({
//     '#': c.index,
//     heading: c.label,
//     chars: c.chars,
//     '~tokens': estimateTokens(text.slice(c.start, c.end)),
//   })),
// );

// if (result.frontMatter) {
//   const fm = text.slice(result.frontMatter.start, result.frontMatter.end);
//   console.log(`Front matter: ${fm.length} chars (~${estimateTokens(fm)} tokens)`);
// }
// console.log(`Total: ${text.length} chars, ~${estimateTokens(text)} tokens, ${result.chapters.length} chapters`);

// for (const w of [...cleanWarnings, ...result.warnings]) console.warn('WARNING:', w);

// if (result.chapters.length) {
//   assertCoverage(text, result);
//   console.log('Coverage check passed: every character belongs to exactly one piece.');
// }