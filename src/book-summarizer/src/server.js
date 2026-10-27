import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLLM } from './llm/index.js';
import { runPipeline } from './pipeline.js';
import { loadBook } from './extract/loadBook.js';
import { detectChapters } from './structure/detectChapters.js';
import { estimateTokens } from './llm/tokens.js';
import { estimateCost, pricingFromEnv } from './pricing.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(join(root, '.env')) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(join(root, '.env'));
}
const dataDir = join(root, 'data');
const outputDir = join(root, 'output');
const port = Number(process.env.PORT ?? 8787);
const jobs = new Map();
const metadata = {
  'dorian-gray': { title: 'The Picture of Dorian Gray', author: 'Oscar Wilde', genre: 'Gothic fiction', year: 1890 },
};

const json = (res, status, value) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(value));
};

async function body(req) {
  let value = '';
  for await (const chunk of req) value += chunk;
  return value ? JSON.parse(value) : {};
}

async function books() {
  const files = (await readdir(dataDir)).filter((file) => extname(file).toLowerCase() === '.txt');
  return Promise.all(files.map(async (file) => {
    const id = basename(file, '.txt');
    const { language, text } = await loadBook(join(dataDir, file));
    const output = join(outputDir, `${id}.json`);
    const info = metadata[id] ?? { title: id.replace(/[-_]/g, ' '), author: 'Unknown author' };
    return {
      id,
      title: info.title,
      author: info.author,
      language,
      genre: info.genre,
      year: info.year,
      description: `${text.length.toLocaleString()} characters ready to summarize.`,
      cover: { palette: ['oklch(0.32 0.06 20)', 'oklch(0.78 0.1 75)'] },
      latestSummaryJobId: existsSync(output) ? id : undefined,
    };
  }));
}

async function book(id) {
  const result = (await books()).find((item) => item.id === id);
  if (!result) throw new Error('Book not found');
  return result;
}

function publicJob(job) {
  return { ...job };
}

function eventFor(jobId, event) {
  const typeMap = {
    run_started: 'job.started',
    chapter_started: 'chapter.started',
    chapter_done: 'chapter.completed',
    retry: 'llm.retry',
    run_done: 'job.completed',
    error: 'job.failed',
  };
  return {
    id: `${jobId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: typeMap[event.type] ?? 'validation.started',
    at: event.timestamp ?? new Date().toISOString(),
    chapter: event.chapter,
    chapterTitle: event.chapterTitle,
    totalChapters: event.totalChapters,
    message: event.message,
    raw: event,
  };
}

async function startJob(input) {
  const b = await book(input.bookId);
  const existing = jobs.get(b.id);
  if (existing && ['queued', 'running'].includes(existing.status)) return existing;
  const now = new Date().toISOString();
  const job = {
    id: b.id,
    bookId: b.id,
    status: 'queued',
    summaryLanguage: input.summaryLanguage ?? b.language,
    createdAt: now,
    completedChapters: 0,
    estimatedCostUsd: input.acceptedEstimateUsd,
    events: [],
  };
  jobs.set(b.id, job);
  void (async () => {
    try {
      const llm = createLLM();
      job.status = 'running';
      job.startedAt = new Date().toISOString();
      await runPipeline({
        filePath: join(dataDir, `${b.id}.txt`),
        title: b.title,
        summaryLanguage: job.summaryLanguage,
        llm,
        workspace: root,
        log: (message) => job.events.push(eventFor(job.id, { type: 'log', message })),
        onEvent: (event) => {
          const item = eventFor(job.id, event);
          job.events.push(item);
          if (item.type === 'chapter.started') {
            job.currentChapter = item.chapter;
            job.currentChapterTitle = item.chapterTitle;
            job.totalChapters = item.totalChapters;
          }
          if (item.type === 'chapter.completed') job.completedChapters = item.chapter ?? job.completedChapters;
        },
      });
      job.status = 'completed';
      job.finishedAt = new Date().toISOString();
      job.currentChapter = undefined;
      job.resumable = false;
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.finishedAt = new Date().toISOString();
      job.events.push(eventFor(job.id, { type: 'error', message: job.error }));
    }
  })();
  return job;
}

async function estimate(input) {
  const b = await book(input.bookId);
  const { text } = await loadBook(join(dataDir, `${b.id}.txt`));
  const { chapters } = detectChapters(text);
  const pricing = pricingFromEnv();
  const promptTokens = Math.ceil(estimateTokens(text, b.language) * 1.12);
  const outputTokens = chapters.length * 1450 + 1800;
  return {
    bookId: b.id,
    sourceLanguage: b.language,
    summaryLanguage: input.summaryLanguage ?? b.language,
    estimatedPromptTokens: promptTokens,
    estimatedOutputTokens: outputTokens,
    estimatedCostUsd: estimateCost({ promptTokens, outputTokens }, { input: pricing.input, output: pricing.output }),
    estimatedSeconds: chapters.length * 40 + 60,
    chapterCount: chapters.length,
    pricing: { inputPerMillion: pricing.input, outputPerMillion: pricing.output },
    model: process.env.LLM_MODEL,
  };
}

async function getJob(id) {
  const b = await book(id);
  const current = jobs.get(id);
  if (current) return publicJob(current);
  if (b.latestSummaryJobId) {
    return {
      id, bookId: id, status: 'completed', summaryLanguage: b.language,
      createdAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
      completedChapters: 0, resumable: false,
    };
  }
  throw new Error('Job not found');
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean);
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      return json(res, 200, {
        service: 'book-summarizer-api',
        status: 'ok',
        frontend: 'http://localhost:8080',
        endpoints: ['/api/books', '/api/estimates', '/api/jobs'],
      });
    }
    if (req.method === 'GET' && url.pathname === '/api/books') return json(res, 200, await books());
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'books' && parts[2]) return json(res, 200, await book(decodeURIComponent(parts[2])));
    if (req.method === 'POST' && url.pathname === '/api/estimates') return json(res, 200, await estimate(await body(req)));
    if (req.method === 'POST' && url.pathname === '/api/jobs') return json(res, 202, publicJob(await startJob(await body(req))));
    if (req.method === 'GET' && url.pathname === '/api/jobs') {
      const all = await books();
      return json(res, 200, (await Promise.all(all.map((b) => getJob(b.id).catch(() => null)))).filter(Boolean));
    }
    if (parts[0] === 'api' && parts[1] === 'jobs' && parts[2]) {
      const id = decodeURIComponent(parts[2]);
      if (req.method === 'GET' && parts.length === 3) return json(res, 200, await getJob(id));
      if (req.method === 'GET' && parts[3] === 'events') return json(res, 200, (jobs.get(id)?.events ?? []));
      if (req.method === 'GET' && parts[3] === 'summary') {
        await getJob(id);
        return json(res, 200, JSON.parse(await readFile(join(outputDir, `${id}.json`), 'utf8')));
      }
      if (req.method === 'GET' && parts[3] === 'export') {
        await getJob(id);
        const format = url.searchParams.get('format') === 'json' ? 'json' : 'md';
        const content = await readFile(join(outputDir, `${id}.${format}`), 'utf8');
        res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': format === 'json' ? 'application/json' : 'text/markdown', 'Content-Disposition': `attachment; filename="${id}.${format}"` });
        return res.end(content);
      }
    }
    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}

createServer(handle).listen(port, () => console.log(`Book summarizer API listening on http://localhost:${port}`));
