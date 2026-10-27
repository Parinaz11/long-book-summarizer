import { OverviewSchema } from '../schema/schemas.js';
import { generateValidated } from '../llm/generateValidated.js';
import { overviewSystemPrompt, overviewUserPrompt } from './prompts.js';

export async function summarizeBook({ llm, title, language, chapters, log, runId, errorLogPath }) {
  const out = await generateValidated({
    llm,
    book: title, runId, errorLogPath,
    step: 'overview',
    system: overviewSystemPrompt(language),
    buildPrompt: (feedback) => overviewUserPrompt({ title, chapters, feedback }),
    zodSchema: OverviewSchema,
    log,
  });
  if (!out.data) throw new Error(`Book overview failed after ${out.attempts} attempts.`);
  return { result: out.data, tokens: out.tokens };
}