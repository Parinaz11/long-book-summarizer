const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
import { mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const NETWORK_CODES = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'UND_ERR_CONNECT_TIMEOUT'];

/** True for errors that are worth retrying: rate limits, server errors, network hiccups. */
export function isRetryable(err) {
  const status = err?.status;
  if (typeof status === 'number') return status === 408 || status === 429 || status >= 500;
  const code = err?.code ?? err?.cause?.code;
  return (
    NETWORK_CODES.includes(code) ||
    err?.name === 'APIConnectionError' ||
    /fetch failed/i.test(err?.message ?? '')
  );
}

export function withRetry(client, {
  maxAttempts = 6, baseDelayMs = 2000, maxDelayMs = 60000, log = console.warn,
  errorLogPath,
} = {}) {
  return {
    ...client,
    async generate(args) {
      for (let attempt = 1; ; attempt++) {
        try {
          return await client.generate(args);
        } catch (err) {
          if (!isRetryable(err) || attempt >= maxAttempts) throw err;

          // If the server says how long to wait, respect it; otherwise back off exponentially.
          const retryAfter = Number(err?.headers?.get?.('retry-after'));
          const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
          const wait = Math.min(maxDelayMs, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoff) + Math.random() * 1000;

          log(`  [retry ${attempt}/${maxAttempts - 1}] ${err.status ?? err.name}: waiting ${(wait / 1000).toFixed(1)}s (${args.step ?? 'step'})`);
          if (args.book || errorLogPath) {
            const book = String(args.book).replace(/[<>:"/\\|?*]/g, '_');
            const path = args.errorLogPath ?? errorLogPath ?? join('.state', book, 'errors.jsonl');
            mkdirSync(join(path, '..'), { recursive: true });
            appendFileSync(path, `${JSON.stringify({
              timestamp: new Date().toISOString(), type: 'retry', step: args.step,
              attempt, status: err?.status, message: err?.message ?? String(err),
            })}\n`);
          }
          await sleep(wait);
        }
      }
    },
  };
}