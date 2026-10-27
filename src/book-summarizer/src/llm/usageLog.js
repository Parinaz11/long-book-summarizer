import { mkdirSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function withUsageLogging(client, logPath) {
  mkdirSync(dirname(logPath), { recursive: true });
  return {
    ...client,
    async generate(args) {
      const t0 = Date.now();
      let result;
      try {
        result = await client.generate(args);
      } catch (error) {
        const book = String(args.book ?? 'unknown').replace(/[<>:"/\\|?*]/g, '_');
        const errorPath = join('.state', book, 'errors.jsonl');
        mkdirSync(dirname(errorPath), { recursive: true });
        appendFileSync(errorPath, `${JSON.stringify({
          timestamp: new Date().toISOString(), type: 'api_error', step: args.step,
          status: error?.status, message: error?.message ?? String(error),
        })}\n`);
        throw error;
      }
      const entry = {
        ts: new Date().toISOString(),
        step: args.step ?? 'unknown',
        book: args.book,
        runId: args.runId,
        provider: client.provider,
        model: client.model,
        latencyMs: Date.now() - t0,
        finishReason: result.finishReason,
        ...result.usage,
      };
      appendFileSync(logPath, JSON.stringify(entry) + '\n');
      return result;
    },
  };
}