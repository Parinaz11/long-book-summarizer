import { toModelSchema } from '../schema/schemas.js';
import { emptyUsage, addUsage } from './tokens.js';

export async function generateValidated({
  llm, book, runId, errorLogPath, step, system, buildPrompt, zodSchema, extraValidate,
  maxAttempts = 3, maxOutputTokens = 8192, log = () => {},
}) {
  const modelSchema = toModelSchema(zodSchema);
  const tokens = emptyUsage();
  let feedback = [];
  let lastParsed = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await llm.generate({
        step, book, runId, errorLogPath, system, prompt: buildPrompt(feedback), jsonSchema: modelSchema, maxOutputTokens,
    });
    addUsage(tokens, res.usage);

    if (res.finishReason === 'MAX_TOKENS') {
      feedback = ['Your previous answer was cut off because it was too long. Answer more concisely.'];
      log(`  attempt ${attempt}: cut off (MAX_TOKENS)`);
      continue;
    }

    let json;
    try {
      json = JSON.parse(res.text);
    } catch (e) {
      feedback = [`Your previous answer was not valid JSON (${e.message}).`];
      log(`  attempt ${attempt}: invalid JSON`);
      continue;
    }

    const parsed = zodSchema.safeParse(json);
    if (!parsed.success) {
      feedback = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
      log(`  attempt ${attempt}: wrong shape (${feedback[0]})`);
      continue;
    }

    lastParsed = parsed.data;
    const problems = extraValidate ? extraValidate(parsed.data) : [];
    if (problems.length === 0) return { data: parsed.data, valid: true, attempts: attempt, tokens };

    feedback = problems;
    log(`  attempt ${attempt}: ${problems.length} problem(s), e.g. ${problems[0]}`);
  }
  return { data: lastParsed, valid: false, attempts: maxAttempts, tokens };
}