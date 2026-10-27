import { z } from 'zod';

export const CharacterSchema = z.object({ name: z.string(), role: z.string() });

export const SectionSchema = z.object({
  title: z.string(),
  summary: z.string(),
  startParagraph: z.number().int(),
  endParagraph: z.number().int(),
});

export const ChapterResultSchema = z.object({
  chapterTitle: z.string(),
  chapterSummary: z.string(),
  sections: z.array(SectionSchema),
  storySoFar: z.string(), // rolling memory, rewritten after every chapter
  characters: z.array(CharacterSchema),
});

export const OverviewSchema = z.object({
  overview: z.string(),
  themes: z.array(z.string()),
  mainCharacters: z.array(CharacterSchema),
});

const UsageSchema = z.object({
  promptTokens: z.number().nonnegative(),
  outputTokens: z.number().nonnegative(),
  thinkingTokens: z.number().nonnegative(),
  totalTokens: z.number().nonnegative(),
});

export const BookOutputSchema = z.object({
  schemaVersion: z.string().min(1),
  book: z.object({
    title: z.string().min(1), language: z.string().min(1), provider: z.string().min(1),
    model: z.string().min(1), promptVersion: z.string().min(1), runId: z.string().min(1).optional(), generatedAt: z.string().min(1),
    partial: z.boolean(), chapterCount: z.number().int().nonnegative(),
  }),
  overview: OverviewSchema.nullable(),
  chapters: z.array(z.object({
    index: z.number().int().positive(), heading: z.string(), title: z.string(), summary: z.string(),
    paragraphCount: z.number().int().nonnegative(), repaired: z.boolean(),
    attempts: z.number().int().positive(), sections: z.array(SectionSchema),
    tokens: UsageSchema, fromCache: z.boolean(),
  })),
  tokensSpentThisRun: UsageSchema,
  warnings: z.array(z.string()),
  repairFlags: z.array(z.string()).optional(),
});

/**
 * Zod schema -> plain JSON Schema for the model API. Some providers reject extra keywords
 * (like $schema, minimum, maximum), so we strip them. Our own code enforces the real rules.
 */
export function toModelSchema(zodSchema) {
  const DROP = new Set(['$schema', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum']);
  const strip = (node) => {
    if (Array.isArray(node)) return node.map(strip);
    if (node && typeof node === 'object') {
      return Object.fromEntries(
        Object.entries(node)
          .filter(([k]) => !DROP.has(k))
          .map(([k, v]) => [k, strip(v)]),
      );
    }
    return node;
  };
  return strip(z.toJSONSchema(zodSchema));
}