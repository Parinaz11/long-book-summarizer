// @ts-nocheck -- demo-only simulator; strict index checks relaxed
// DEMO MODE ONLY. Simulates the backend so the full journey can be previewed.
// Nothing here performs real work, real charges or real AI calls.
import type { Book, Estimate, Job, JobEvent, LanguageCode, SummaryDoc } from "../types";
import type { ApiClient } from "./client";
import { DEMO_BOOKS, DEMO_BOOK_STATS } from "@/demo/catalog";

/** Demo-only pricing (USD per million tokens). Real pricing comes from the backend's LLM_INPUT_PRICE / LLM_OUTPUT_PRICE. */
const DEMO_PRICING = { inputPerMillion: 0.1, outputPerMillion: 0.4 };
const STRUCTURE_MS = 2500;
const CHAPTER_MS = 1400;
const FINAL_MS = 2500;
const KEY = "chapterly.demo.jobs.v1";

interface StoredJob {
  job: Job;
  /** ms epoch when the current (simulated) run segment started */
  runStart?: number;
  /** chapters already done before this segment (resume) */
  offset: number;
  events: JobEvent[];
}

const SAMPLES: Record<string, { json: () => Promise<SummaryDoc>; md: () => Promise<string> }> = {
  "dorian-gray": {
    json: () => import("@/demo/dorian-gray.json").then((m) => m.default as unknown as SummaryDoc),
    md: () => import("@/demo/dorian-gray.md?raw").then((m) => m.default),
  },
  "alice-fa": {
    json: () => import("@/demo/alice-fa.json").then((m) => m.default as unknown as SummaryDoc),
    md: () => import("@/demo/alice-fa.md?raw").then((m) => m.default),
  },
};

const cost = (p: number, o: number) =>
  (p * DEMO_PRICING.inputPerMillion + o * DEMO_PRICING.outputPerMillion) / 1_000_000;

function seed(): Record<string, StoredJob> {
  const ev = (id: string, type: JobEvent["type"], at: string, extra: Partial<JobEvent> = {}): JobEvent => ({
    id,
    type,
    at,
    ...extra,
  });
  return {
    "demo-dorian": {
      offset: 0,
      events: [
        ev("s1", "job.started", "2026-10-27T13:05:02Z"),
        ev("s2", "job.completed", "2026-10-27T13:18:46Z", { totalChapters: 20 }),
      ],
      job: {
        id: "demo-dorian",
        bookId: "dorian-gray",
        status: "completed",
        summaryLanguage: "en",
        createdAt: "2026-10-27T13:05:00Z",
        startedAt: "2026-10-27T13:05:02Z",
        finishedAt: "2026-10-27T13:18:46Z",
        totalChapters: 20,
        completedChapters: 20,
        estimatedCostUsd: cost(141000, 30000),
        actualCostUsd: cost(130562, 28448),
      },
    },
    "demo-alice": {
      offset: 0,
      events: [
        ev("a1", "job.started", "2026-10-26T01:22:10Z"),
        ev("a2", "job.completed", "2026-10-26T01:36:26Z", { totalChapters: 12 }),
      ],
      job: {
        id: "demo-alice",
        bookId: "alice-fa",
        status: "completed",
        summaryLanguage: "fa",
        createdAt: "2026-10-26T01:22:08Z",
        startedAt: "2026-10-26T01:22:10Z",
        finishedAt: "2026-10-26T01:36:26Z",
        totalChapters: 12,
        completedChapters: 12,
        estimatedCostUsd: cost(70000, 19000),
        actualCostUsd: cost(69172, 18342),
      },
    },
    "demo-frankenstein": {
      offset: 9,
      events: [
        ev("f1", "job.started", "2026-10-25T18:40:00Z"),
        ev("f2", "structure.detected", "2026-10-25T18:40:03Z", { totalChapters: 24 }),
        ev("f3", "chapter.completed", "2026-10-25T18:47:51Z", { chapter: 9, totalChapters: 24 }),
        ev("f4", "job.failed", "2026-10-25T18:48:20Z", {
          message: "Process stopped before chapter 10 finished (rate limit exhausted).",
          raw: { code: "RATE_LIMIT", attempts: 5 },
        }),
      ],
      job: {
        id: "demo-frankenstein",
        bookId: "frankenstein",
        status: "interrupted",
        summaryLanguage: "en",
        createdAt: "2026-10-25T18:39:58Z",
        startedAt: "2026-10-25T18:40:00Z",
        totalChapters: 24,
        completedChapters: 9,
        currentChapter: 10,
        estimatedCostUsd: cost(118000, 33000),
        actualCostUsd: cost(44100, 11900),
        resumable: true,
        error: "Process stopped before chapter 10 finished.",
      },
    },
  };
}

function load(): Record<string, StoredJob> {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const s = seed();
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}
function save(all: Record<string, StoredJob>) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(all));
}

/** Deterministically advance a simulated job based on wall-clock time. */
function advance(s: StoredJob, now = Date.now()): StoredJob {
  if (!s.runStart || !["queued", "running"].includes(s.job.status)) return s;
  const book = DEMO_BOOKS.find((b) => b.id === s.job.bookId)!;
  const total = DEMO_BOOK_STATS[book.id].chapters;
  const titles = DEMO_BOOK_STATS[book.id].chapterTitles;
  const t = now - s.runStart;
  const iso = (ms: number) => new Date(s.runStart! + ms).toISOString();
  const events: JobEvent[] = s.events.filter((e) => e.raw?.segment !== s.runStart);
  const seg = { segment: s.runStart, demo: true };
  const push = (ms: number, e: Omit<JobEvent, "id" | "at">) => {
    if (t >= ms) events.push({ id: `${s.runStart}-${events.length}`, at: iso(ms), ...e, raw: { ...seg, ...e.raw, type: e.type } });
  };
  push(0, { type: "job.started" });
  push(400, { type: "structure.analyzing" });
  push(STRUCTURE_MS - 300, { type: "structure.detected", totalChapters: total });
  let done = s.offset;
  let current: number | undefined;
  for (let c = s.offset + 1; c <= total; c++) {
    const start = STRUCTURE_MS + (c - s.offset - 1) * CHAPTER_MS;
    push(start, { type: "chapter.started", chapter: c, chapterTitle: titles?.[c - 1], totalChapters: total });
    if (t >= start) current = c;
    if (c === s.offset + 3) push(start + 600, { type: "llm.retry", chapter: c, raw: { status: 503, attempt: 1, delayMs: 800 } });
    if (t >= start + CHAPTER_MS) {
      push(start + CHAPTER_MS - 1, { type: "chapter.completed", chapter: c, chapterTitle: titles?.[c - 1], totalChapters: total });
      done = c;
    }
  }
  const chaptersEnd = STRUCTURE_MS + (total - s.offset) * CHAPTER_MS;
  push(chaptersEnd, { type: "overview.started" });
  push(chaptersEnd + FINAL_MS / 2, { type: "validation.started" });
  const finished = t >= chaptersEnd + FINAL_MS;
  const stats = DEMO_BOOK_STATS[book.id];
  if (finished) push(chaptersEnd + FINAL_MS, { type: "job.completed", totalChapters: total });
  const job: Job = {
    ...s.job,
    status: finished ? "completed" : "running",
    startedAt: s.job.startedAt ?? iso(0),
    totalChapters: total,
    completedChapters: done,
    currentChapter: finished ? undefined : current,
    currentChapterTitle: current ? titles?.[current - 1] : undefined,
    finishedAt: finished ? iso(chaptersEnd + FINAL_MS) : undefined,
    actualCostUsd: cost(stats.actualPromptTokens * (done / total), stats.actualOutputTokens * (done / total)),
    resumable: false,
    error: undefined,
  };
  return { ...s, job, events };
}

function getAll() {
  const all = load();
  let changed = false;
  for (const k of Object.keys(all)) {
    const next = advance(all[k]);
    if (next !== all[k]) {
      all[k] = next;
      changed = true;
    }
  }
  if (changed) save(all);
  return all;
}

const delay = <T,>(v: T, ms = 350) => new Promise<T>((r) => setTimeout(() => r(v), ms));

function withLatest(books: Book[]): Book[] {
  const jobs = Object.values(getAll()).map((s) => s.job);
  return books.map((b) => {
    const done = jobs
      .filter((j) => j.bookId === b.id && j.status === "completed" && SAMPLES[b.id])
      .sort((a, z) => (z.finishedAt ?? "").localeCompare(a.finishedAt ?? ""))[0];
    return { ...b, latestSummaryJobId: done?.id };
  });
}

export const demoClient: ApiClient = {
  listBooks: () => delay(withLatest(DEMO_BOOKS)),
  async getBook(id) {
    const b = withLatest(DEMO_BOOKS).find((x) => x.id === id);
    if (!b) throw new Error("Book not found");
    return delay(b, 150);
  },
  async estimate({ bookId, summaryLanguage }) {
    const b = DEMO_BOOKS.find((x) => x.id === bookId);
    if (!b) throw new Error("Book not found");
    const st = DEMO_BOOK_STATS[bookId];
    // Mirrors the engine's heuristic: ~4 chars/token (en), ~2.75 (fa), plus prompt overhead.
    const prompt = Math.ceil((st.characters / (b.language === "fa" ? 2.75 : 4)) * 1.12);
    const output = st.chapters * 1450 + 1800;
    const e: Estimate = {
      bookId,
      sourceLanguage: b.language,
      summaryLanguage: summaryLanguage as LanguageCode,
      estimatedPromptTokens: prompt,
      estimatedOutputTokens: output,
      estimatedCostUsd: cost(prompt, output),
      estimatedSeconds: st.chapters * 40 + 60,
      chapterCount: st.chapters,
      pricing: DEMO_PRICING,
      model: "demo · google/gemini-3.5-flash-lite",
    };
    return delay(e, 700);
  },
  async startJob({ bookId, summaryLanguage, acceptedEstimateUsd }) {
    const all = getAll();
    // Prevent duplicates: return the in-flight job for this book if any.
    const running = Object.values(all).find(
      (s) => s.job.bookId === bookId && ["queued", "running"].includes(s.job.status),
    );
    if (running) return delay(running.job, 200);
    const id = `demo-${bookId}-${Date.now().toString(36)}`;
    const now = Date.now();
    all[id] = {
      runStart: now,
      offset: 0,
      events: [],
      job: {
        id,
        bookId,
        status: "queued",
        summaryLanguage,
        createdAt: new Date(now).toISOString(),
        completedChapters: 0,
        estimatedCostUsd: acceptedEstimateUsd,
      },
    };
    save(all);
    return delay(getAll()[id].job, 300);
  },
  listJobs: () =>
    delay(Object.values(getAll()).map((s) => s.job).sort((a, z) => z.createdAt.localeCompare(a.createdAt))),
  async getJob(id) {
    const s = getAll()[id];
    if (!s) throw new Error("Job not found");
    return delay(s.job, 120);
  },
  async getJobEvents(id) {
    const s = getAll()[id];
    if (!s) throw new Error("Job not found");
    return delay(s.events, 120);
  },
  async resumeJob(id) {
    const all = getAll();
    const s = all[id];
    if (!s) throw new Error("Job not found");
    if (!s.job.resumable) throw new Error("This job cannot be resumed");
    all[id] = { ...s, offset: s.job.completedChapters, runStart: Date.now(), job: { ...s.job, status: "running" } };
    save(all);
    return delay(getAll()[id].job, 200);
  },
  subscribe(id, onEvent, onJob) {
    const seen = new Set<string>();
    const tick = () => {
      const s = getAll()[id];
      if (!s) return;
      s.events.forEach((e) => {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          onEvent(e);
        }
      });
      onJob(s.job);
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  },
  async getSummary(id) {
    const s = getAll()[id];
    if (!s) throw new Error("Job not found");
    if (s.job.status !== "completed") throw new Error("This summary isn't finished yet.");
    const sample = SAMPLES[s.job.bookId];
    if (!sample) throw new Error("DEMO_NO_SAMPLE");
    return sample.json();
  },
  async exportFile(id, format) {
    const s = getAll()[id];
    const sample = s && SAMPLES[s.job.bookId];
    if (!sample) throw new Error("No sample file is bundled for this title in demo mode.");
    if (format === "json") {
      const doc = await sample.json();
      return { filename: `${s.job.bookId}.json`, content: JSON.stringify(doc, null, 2), mime: "application/json" };
    }
    return { filename: `${s.job.bookId}.md`, content: await sample.md(), mime: "text/markdown" };
  },
};
