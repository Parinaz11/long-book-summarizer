import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { withRetry } from '../src/llm/retry.js';
import { generateValidated } from '../src/llm/generateValidated.js';
import { ChapterResultSchema, BookOutputSchema } from '../src/schema/schemas.js';
import { summarizeChapter } from '../src/summarize/chapter.js';
import { runPipeline } from '../src/pipeline.js';
import { pricingFromEnv } from '../src/pricing.js';
const execFileAsync = promisify(execFile);

const tempDirs = [];
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const usage = { promptTokens: 1, outputTokens: 1, thinkingTokens: 0, totalTokens: 2 };
const chapterJson = (paragraphs = 2, invalidRanges = false) => JSON.stringify({
  chapterTitle: 'A descriptive chapter',
  chapterSummary: 'A faithful summary.',
  sections: [{ title: 'The events', summary: 'Events.', startParagraph: invalidRanges ? 2 : 1, endParagraph: paragraphs }],
  storySoFar: 'The story continues.',
  characters: [{ name: 'A', role: 'person' }],
});
const overviewJson = JSON.stringify({
  overview: 'A book overview.', themes: ['theme'], mainCharacters: [{ name: 'A', role: 'person' }],
});
const fake = (responses) => {
  let calls = 0;
  return {
    provider: 'fake',
    model: 'fake',
    get calls() { return calls; },
    async generate() {
      const response = responses[Math.min(calls++, responses.length - 1)];
      if (response instanceof Error) throw response;
      return { text: response, finishReason: 'STOP', usage };
    },
  };
};
const retryable = (status, message = `HTTP ${status}`) => Object.assign(new Error(message), { status });
async function workspace() {
  const dir = await mkdtemp(join(tmpdir(), 'book-summarizer-day3-'));
  tempDirs.push(dir);
  return dir;
}
async function bookFile(dir, name = 'book.txt') {
  const file = join(dir, name);
  await writeFile(file, 'CHAPTER I.\n\nOne paragraph.\n\nTwo paragraph.\n\nCHAPTER II.\n\nThree paragraph.', 'utf8');
  return file;
}

describe('Day 3 fault recovery', () => {
  it.each([429, 503])('retries HTTP %s and then succeeds', async (status) => {
    const dir = await workspace();
    const errors = join(dir, 'errors.jsonl');
    let attempts = 0;
    const client = withRetry({
      async generate() {
        attempts++;
        if (attempts === 1) throw retryable(status);
        return { text: '{}', usage };
      },
    }, { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0, errorLogPath: errors, log: () => {} });
    await expect(client.generate({ book: 'test-book', step: 'chapter-01' })).resolves.toMatchObject({ text: '{}' });
    expect(attempts).toBe(2);
    expect(await readFile(errors, 'utf8')).toContain(`"status":${status}`);
  });

  it('retries network failures and rejects permanent failures', async () => {
    const dir = await workspace();
    const errors = join(dir, 'errors.jsonl');
    const network = Object.assign(new Error('socket reset'), { code: 'ECONNRESET' });
    let attempts = 0;
    const client = withRetry({ async generate() { attempts++; throw network; } }, {
      maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0, errorLogPath: errors, log: () => {},
    });
    await expect(client.generate({ book: 'test-book', step: 'chapter-01' })).rejects.toThrow('socket reset');
    expect(attempts).toBe(3);
    expect((await readFile(errors, 'utf8')).split('\n').filter(Boolean)).toHaveLength(2);
  });

  it('retries invalid JSON and then accepts valid JSON', async () => {
    const logs = [];
    const client = fake(['{"truncated"', chapterJson()]);
    const result = await generateValidated({
      llm: client, step: 'chapter-01', buildPrompt: () => 'prompt',
      zodSchema: ChapterResultSchema, extraValidate: () => [], log: (message) => logs.push(message),
    });
    expect(result.valid).toBe(true);
    expect(result.attempts).toBe(2);
    expect(logs.some((message) => message.includes('invalid JSON'))).toBe(true);
  });

  it('repairs incorrect section ranges', async () => {
    const result = await summarizeChapter({
      llm: fake([chapterJson(2, true), chapterJson(2, true), chapterJson(2, true)]),
      title: 'Test', language: 'en', chapter: { index: 1, label: 'CHAPTER I.' },
      paragraphs: ['One', 'Two'], state: { storySoFar: '', characters: [] }, log: () => {},
    });
    expect(result.repaired).toBe(true);
    expect(result.result.sections[0]).toMatchObject({ startParagraph: 1, endParagraph: 2 });
  });

  it('resumes from checkpoints after interruption', async () => {
    const dir = await workspace();
    const file = await bookFile(dir);
    const first = fake([chapterJson(2), new Error('interrupted')]);
    await expect(runPipeline({ filePath: file, title: 'Test', llm: first, workspace: dir, limit: 2, log: () => {} })).rejects.toThrow('interrupted');
    const second = fake([chapterJson(1), overviewJson]);
    const logs = [];
    const output = await runPipeline({ filePath: file, title: 'Test', llm: second, workspace: dir, limit: 2, log: (message) => logs.push(message) });
    expect(output.chapters).toHaveLength(2);
    expect(second.calls).toBe(2);
    expect(logs.some((message) => message.includes('chapter-01: reused from checkpoint'))).toBe(true);
  });

  it('recomputes a corrupted checkpoint', async () => {
    const dir = await workspace();
    const file = await bookFile(dir);
    const first = fake([chapterJson(2)]);
    await runPipeline({ filePath: file, title: 'Test', llm: first, workspace: dir, limit: 1, log: () => {} });
    await writeFile(join(dir, '.state', 'book', 'chapter-01.json'), '{broken', 'utf8');
    const second = fake([chapterJson(2)]);
    await runPipeline({ filePath: file, title: 'Test', llm: second, workspace: dir, limit: 1, log: () => {} });
    expect(second.calls).toBe(1);
  });

  it('splits oversized chapters and preserves paragraph coverage', async () => {
    const dir = await workspace();
    const file = await bookFile(dir, 'large.txt');
    const output = await runPipeline({
      filePath: file, title: 'Test', llm: fake([chapterJson(1)]), workspace: dir,
      limit: 1, maxChunkTokens: 1, force: true, log: () => {},
    });
    const chapter = output.chapters[0];
    expect(chapter.paragraphCount).toBe(2);
    expect(chapter.sections[0].startParagraph).toBe(1);
    expect(chapter.sections.at(-1).endParagraph).toBe(2);
    expect(chapter.tokens.totalTokens).toBeGreaterThan(2);
  });

  it('rejects invalid final book JSON', () => {
    expect(BookOutputSchema.safeParse({ schemaVersion: '1.0' }).success).toBe(false);
  });

  it('records lifecycle events and marks permanent failures as errors', async () => {
    const dir = await workspace();
    const file = await bookFile(dir);
    const events = [];
    await expect(runPipeline({
      filePath: file, title: 'Test', llm: fake([new Error('permanent')]), workspace: dir,
      limit: 1, log: () => {}, onEvent: (event) => events.push(event),
    })).rejects.toThrow('permanent');
    const status = JSON.parse(await readFile(join(dir, '.state', 'book', 'status.json'), 'utf8'));
    const errors = await readFile(join(dir, '.state', 'book', 'errors.jsonl'), 'utf8');
    expect(status).toMatchObject({ status: 'error', latestError: 'permanent' });
    expect(errors).toContain('"type":"error"');
    expect(events.map((event) => event.type)).toEqual(expect.arrayContaining(['run_started', 'chapter_started', 'error']));
  });

  it('keeps retry logs inside the configured workspace', async () => {
    const dir = await workspace();
    const file = await bookFile(dir);
    let attempts = 0;
    const base = {
      provider: 'fake',
      model: 'fake',
      async generate(args) {
        attempts++;
        if (attempts === 1) throw retryable(429);
        return { text: chapterJson(2), finishReason: 'STOP', usage };
      },
    };
    const llm = withRetry(base, { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0, log: () => {} });
    await runPipeline({ filePath: file, title: 'Test', llm, workspace: dir, limit: 1, log: () => {} });
    const errors = await readFile(join(dir, '.state', 'book', 'errors.jsonl'), 'utf8');
    expect(errors).toContain('"type":"retry"');
    expect(errors).toContain('"status":429');
  });
});

describe('Day 3 pricing safeguards', () => {
  it('requires explicit pricing instead of silently using zero', () => {
    expect(() => pricingFromEnv({})).toThrow(/LLM_INPUT_PRICE and LLM_OUTPUT_PRICE/);
    // expect(pricingFromEnv({ LLM_INPUT_PRICE: '0.1', LLM_OUTPUT_PRICE: '0.4' })).toEqual({ input: 0.1, output: 0.4 });
    // CHECKED PRICING FOR google/gemini-3.5-flash-lite
    expect(pricingFromEnv({ LLM_INPUT_PRICE: '0.30', LLM_OUTPUT_PRICE: '2.50' })).toEqual({ input: 0.30, output: 2.50 });
  });

  it('reports only the output run and refuses missing pricing', async () => {
    const dir = await workspace();
    const output = join(dir, 'book.json');
    const usage = join(dir, 'usage.jsonl');
    await writeFile(output, JSON.stringify({ book: { title: 'Test', runId: 'run-2' } }));
    await writeFile(usage, [
      JSON.stringify({ book: 'Test', runId: 'run-1', step: 'chapter-01', promptTokens: 100, outputTokens: 10 }),
      JSON.stringify({ book: 'Test', runId: 'run-2', step: 'chapter-01', promptTokens: 2, outputTokens: 3 }),
    ].join('\n'));
    const env = { ...process.env, LLM_INPUT_PRICE: '1', LLM_OUTPUT_PRICE: '2' };
    const result = await execFileAsync(process.execPath, ['scripts/report.js', output, '--usage', usage], { env, cwd: process.cwd() });
    const report = JSON.parse(result.stdout);
    expect(report.usageRecords).toBe(1);
    expect(report.totals).toMatchObject({ promptTokens: 2, outputTokens: 3 });
    await expect(execFileAsync(process.execPath, ['scripts/report.js', output, '--usage', usage], {
      env: { ...process.env, LLM_INPUT_PRICE: '', LLM_OUTPUT_PRICE: '' }, cwd: process.cwd(),
    })).rejects.toThrow(/Pricing is not configured/);
    await expect(execFileAsync(process.execPath, ['scripts/report.js', output, '--usage', join(dir, 'missing.jsonl')], {
      env, cwd: process.cwd(),
    })).rejects.toThrow(/No usage records found/);
  });
});
