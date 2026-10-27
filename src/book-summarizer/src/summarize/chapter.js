import { ChapterResultSchema } from '../schema/schemas.js';
import { generateValidated } from '../llm/generateValidated.js';
import { chapterSystemPrompt, chapterUserPrompt } from './prompts.js';
import { validateSections, repairSections, validateTitle} from './validate.js';
import { estimateTokens } from '../llm/tokens.js';

async function summarizeSingle({ llm, title, language, chapter, paragraphs, state, log, runId, errorLogPath }) {
  const n = paragraphs.length;
  const out = await generateValidated({
    llm,
    book: title, runId, errorLogPath,
    step: `chapter-${String(chapter.index).padStart(2, '0')}`,
    system: chapterSystemPrompt(language),
    buildPrompt: (feedback) => chapterUserPrompt({ title, language, chapter, paragraphs, state, feedback }),
    zodSchema: ChapterResultSchema,
    // extraValidate: (d) => validateSections(d.sections, n),
    extraValidate: (d) => [...validateSections(d.sections, n), ...validateTitle(d.chapterTitle)],
    log,
  });

  if (!out.data) throw new Error(`${chapter.label}: no usable response after ${out.attempts} attempts.`);
  if (out.valid) return { result: out.data, repaired: false, attempts: out.attempts, tokens: out.tokens };

  log('  WARNING: section ranges were still wrong; repaired automatically.');
  return {
    result: { ...out.data, sections: repairSections(out.data.sections, n) },
    repaired: true,
    attempts: out.attempts,
    tokens: out.tokens,
  };
}

export async function summarizeChapter({ llm, title, language, chapter, paragraphs, state, log, maxChunkTokens = 12000, runId, errorLogPath }) {
  if (estimateTokens(paragraphs.join('\n\n'), language) <= maxChunkTokens) {
    return summarizeSingle({ llm, title, language, chapter, paragraphs, state, log, runId, errorLogPath });
  }

  const chunks = [];
  let current = [];
  let currentTokens = 0;
  for (const paragraph of paragraphs) {
    const size = estimateTokens(paragraph, language);
    if (current.length && currentTokens + size > maxChunkTokens) {
      chunks.push(current);
      current = [];
      currentTokens = 0;
    }
    current.push(paragraph);
    currentTokens += size;
  }
  if (current.length) chunks.push(current);

  let rolling = state;
  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const result = await summarizeSingle({
      llm, title, language,
      chapter: { ...chapter, label: `${chapter.label} (part ${i + 1}/${chunks.length})` },
      paragraphs: chunks[i], state: rolling, log, runId, errorLogPath,
    });
    results.push(result);
    rolling = { storySoFar: result.result.storySoFar, characters: result.result.characters };
  }
  let offset = 0;
  const sections = results.flatMap((part) => {
    const mapped = part.result.sections.map((section) => ({
      ...section,
      startParagraph: section.startParagraph + offset,
      endParagraph: section.endParagraph + offset,
    }));
    offset += part.result.sections.length ? chunks[results.indexOf(part)].length : 0;
    return mapped;
  });
  return {
    result: {
      chapterTitle: results[0].result.chapterTitle,
      chapterSummary: results.map((part) => part.result.chapterSummary).join('\n\n'),
      sections,
      storySoFar: rolling.storySoFar,
      characters: rolling.characters,
    },
    repaired: results.some((part) => part.repaired),
    attempts: results.reduce((sum, part) => sum + part.attempts, 0),
    tokens: results.reduce((sum, part) => {
      for (const key of Object.keys(sum)) sum[key] += part.tokens[key] ?? 0;
      return sum;
    }, { promptTokens: 0, outputTokens: 0, thinkingTokens: 0, totalTokens: 0 }),
  };
}