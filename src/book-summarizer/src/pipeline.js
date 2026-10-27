import { basename, extname, join } from 'node:path';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { loadBook } from './extract/loadBook.js';
import { detectChapters, assertCoverage } from './structure/detectChapters.js';
import { chapterParagraphs } from './structure/paragraphs.js';
import { summarizeChapter } from './summarize/chapter.js';
import { summarizeBook } from './summarize/overview.js';
import { PROMPT_VERSION } from './summarize/prompts.js';
import { createStore, cached, hashOf } from './state/store.js';
import { renderMarkdown } from './render/markdown.js';
import { emptyUsage, addUsage } from './llm/tokens.js';
import { BookOutputSchema } from './schema/schemas.js';
import { logBookError } from './state/errors.js';
import { randomUUID } from 'node:crypto';

export async function runPipeline({
  filePath, title, limit, force = false, llm, log = console.log, onEvent = () => {},
  summaryLanguage,
  maxChunkTokens = 12000, workspace = '.',
}) {
  const bookId = basename(filePath, extname(filePath));
  const runId = randomUUID();
  const stateDir = join(workspace, '.state', bookId);
  const store = createStore(stateDir);
  const statusPath = join(stateDir, 'status.json');
  const errorPath = join(stateDir, 'errors.jsonl');
  const startedAt = new Date().toISOString();
  let latestError = null;
  const status = { book: title, status: 'running', currentChapter: 0, totalChapters: 0, startedAt, endAt: null, latestError: null };
  const updateStatus = async (patch = {}) => {
    Object.assign(status, patch);
    await mkdir(stateDir, { recursive: true });
    const tmp = `${statusPath}.tmp`;
    await writeFile(tmp, JSON.stringify(status, null, 2), 'utf8');
    await rename(tmp, statusPath);
  };
  const emit = (type, data = {}) => onEvent({ type, book: title, timestamp: new Date().toISOString(), ...data });
  const reportLog = (message) => {
    log(message);
    if (String(message).includes('[retry')) emit('retry', { message });
    if (String(message).includes('WARNING')) emit('warning', { message });
  };
  await updateStatus();
  emit('run_started');

  try {
    const { text, language: sourceLanguage, warnings } = await loadBook(filePath);
    const language = summaryLanguage ?? sourceLanguage;
    const detected = detectChapters(text);
    if (detected.chapters.length === 0) throw new Error('No chapters detected; cannot continue.');
    assertCoverage(text, detected);
    await updateStatus({ totalChapters: detected.chapters.length });
    reportLog(`"${title}": language=${language}, ${detected.chapters.length} chapters, model=${llm.model}`);
    for (const warning of warnings) {
      reportLog(`WARNING: ${warning}`);
      emit('warning', { message: warning });
    }

    const chapters = limit ? detected.chapters.slice(0, limit) : detected.chapters;
    const partial = chapters.length < detected.chapters.length;

    let state = { storySoFar: '', characters: [] };
    const spent = emptyUsage();
    const outChapters = [];

    for (const ch of chapters) {
    await updateStatus({ currentChapter: ch.index });
    emit('chapter_started', { chapter: ch.index });
    const paragraphs = chapterParagraphs(text, ch);
    const name = `chapter-${String(ch.index).padStart(2, '0')}`;
    const key = hashOf({
      v: PROMPT_VERSION, provider: llm.provider, model: llm.model, language, title, paragraphs, state, maxChunkTokens,
    });
    reportLog(`${ch.label} (${paragraphs.length} paragraphs)`);

    const out = await cached(
      store, name, key,
      () => summarizeChapter({
        llm, title, language, chapter: ch, paragraphs, state, log: reportLog,
        maxChunkTokens, runId, errorLogPath: errorPath,
      }),
      { force, log: reportLog },
    );
    if (!out.fromCache) addUsage(spent, out.tokens);

    const r = out.result;
    state = { storySoFar: r.storySoFar, characters: r.characters };
    outChapters.push({
      index: ch.index,
      heading: ch.label,
      title: r.chapterTitle,
      summary: r.chapterSummary,
      paragraphCount: paragraphs.length,
      repaired: out.repaired,
      attempts: out.attempts,
      sections: r.sections.map((s, i) => ({ index: i + 1, ...s })),
      tokens: out.tokens,
      fromCache: out.fromCache,
    });
    emit('chapter_done', { chapter: ch.index, tokens: out.tokens, fromCache: out.fromCache });
  }

  let overview = null;
  if (partial) {
    reportLog('Partial run (--limit): skipping the whole-book overview.');
  } else {
    const key = hashOf({
      v: PROMPT_VERSION, provider: llm.provider, model: llm.model, language, title,
      summaries: outChapters.map((c) => [c.title, c.summary]),
    });
    reportLog('Book overview');
    const out = await cached(
      store, 'overview', key,
      () => summarizeBook({
        llm, title, language, chapters: outChapters, log: reportLog,
        runId, errorLogPath: errorPath,
      }),
      { force, log: reportLog },
    );
    if (!out.fromCache) addUsage(spent, out.tokens);
    overview = out.result;
  }

  const output = {
    schemaVersion: '1.0',
    book: {
      title, language, provider: llm.provider, model: llm.model, promptVersion: PROMPT_VERSION, runId,
      generatedAt: new Date().toISOString(), partial, chapterCount: outChapters.length,
    },
    overview,
    chapters: outChapters,
    tokensSpentThisRun: spent,
    warnings,
  };

  const valid = BookOutputSchema.safeParse(output);
  if (!valid.success) throw new Error(`Final book output validation failed: ${valid.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  await mkdir(join(workspace, 'output'), { recursive: true });
  await writeFile(join(workspace, 'output', `${bookId}.json`), JSON.stringify(output, null, 2), 'utf8');
  await writeFile(join(workspace, 'output', `${bookId}.md`), renderMarkdown(output), 'utf8');
  reportLog(`Done. Tokens spent this run: ${JSON.stringify(spent)}`);
  reportLog(`Wrote output/${bookId}.json and output/${bookId}.md`);
  await updateStatus({ status: 'done', endAt: new Date().toISOString(), latestError: null });
  emit('run_done', { tokens: spent });
  return output;
  } catch (err) {
    latestError = err instanceof Error ? err.message : String(err);
    await logBookError(errorPath, { type: 'error', message: latestError });
    await updateStatus({ status: 'error', endAt: new Date().toISOString(), latestError });
    emit('error', { message: latestError });
    throw err;
  }
}