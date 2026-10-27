// Shared types. Summary types mirror the real output schema of the
// book-summarizer engine (output/*.json, schemaVersion "1.0").

export type LanguageCode = "en" | "fa";

export interface BookCover {
  /** Optional real image URL. When missing a typographic cover is drawn. */
  imageUrl?: string | undefined;
  /** Two colors used by the typographic cover (CSS color strings). */
  palette: [string, string];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  language: LanguageCode;
  genre?: string | undefined;
  description?: string | undefined;
  year?: number | undefined;
  cover: BookCover;
  /** Latest completed job for this book, if any. */
  latestSummaryJobId?: string | undefined;
}

export interface Estimate {
  bookId: string;
  sourceLanguage: LanguageCode;
  summaryLanguage: LanguageCode;
  estimatedPromptTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  estimatedSeconds?: number | undefined;
  chapterCount?: number | undefined;
  pricing: { inputPerMillion: number; outputPerMillion: number };
  model?: string | undefined;
}

export type JobStatus = "queued" | "running" | "completed" | "failed" | "interrupted";

export type JobEventType =
  | "job.queued"
  | "job.started"
  | "structure.analyzing"
  | "structure.detected"
  | "chapter.started"
  | "chapter.completed"
  | "llm.retry"
  | "overview.started"
  | "validation.started"
  | "job.completed"
  | "job.failed";

export interface JobEvent {
  id: string;
  type: JobEventType;
  at: string; // ISO timestamp
  chapter?: number | undefined;
  chapterTitle?: string | undefined;
  totalChapters?: number | undefined;
  message?: string | undefined;
  raw?: Record<string, unknown> | undefined;
}

export interface Job {
  id: string;
  bookId: string;
  status: JobStatus;
  summaryLanguage: LanguageCode;
  createdAt: string;
  startedAt?: string | undefined;
  finishedAt?: string | undefined;
  totalChapters?: number | undefined;
  completedChapters: number;
  currentChapter?: number | undefined;
  currentChapterTitle?: string | undefined;
  estimatedCostUsd?: number | undefined;
  actualCostUsd?: number | undefined;
  resumable?: boolean | undefined;
  error?: string | undefined;
}

/* ---- Summary output schema (from the engine) ---- */
export interface TokenUsage {
  promptTokens: number;
  outputTokens: number;
  thinkingTokens?: number | undefined;
  totalTokens: number;
}

export interface SummarySection {
  index: number;
  title: string;
  summary: string;
  startParagraph?: number | undefined;
  endParagraph?: number | undefined;
}

export interface SummaryChapter {
  index: number;
  heading?: string | undefined;
  title: string;
  summary: string;
  paragraphCount?: number | undefined;
  repaired?: boolean | undefined;
  attempts?: number | undefined;
  sections?: SummarySection[] | undefined;
  tokens?: TokenUsage | undefined;
  fromCache?: boolean | undefined;
}

export interface SummaryDoc {
  schemaVersion: string;
  book: {
    title: string;
    language: LanguageCode | string;
    provider?: string | undefined;
    model?: string | undefined;
    promptVersion?: string | undefined;
    runId?: string | undefined;
    generatedAt?: string | undefined;
    partial?: boolean | undefined;
    chapterCount?: number | undefined;
  };
  overview: {
    overview: string;
    themes?: string[] | undefined;
    mainCharacters?: { name: string | undefined; role: string }[];
  };
  chapters: SummaryChapter[];
  tokensSpentThisRun?: TokenUsage | undefined;
  warnings?: unknown[] | undefined;
}
