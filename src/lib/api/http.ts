import { API_BASE_URL } from "../config";
import type { Book, Estimate, Job, JobEvent, SummaryDoc } from "../types";
import type { ApiClient } from "./client";

// Proposed endpoint contract. These endpoints do NOT exist yet in the
// book-summarizer repo (it is CLI-only). Adapt the mapping here only.
const endpoints = {
  books: () => `/api/books`,
  book: (id: string) => `/api/books/${encodeURIComponent(id)}`,
  estimates: () => `/api/estimates`,
  jobs: () => `/api/jobs`,
  job: (id: string) => `/api/jobs/${encodeURIComponent(id)}`,
  resume: (id: string) => `/api/jobs/${encodeURIComponent(id)}/resume`,
  events: (id: string) => `/api/jobs/${encodeURIComponent(id)}/events`,
  summary: (id: string) => `/api/jobs/${encodeURIComponent(id)}/summary`,
  export: (id: string, f: string) => `/api/jobs/${encodeURIComponent(id)}/export?format=${f}`,
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE_URL.replace(/\/$/, "") + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      msg = body.error ?? body.message ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const httpClient: ApiClient = {
  listBooks: () => req<Book[]>(endpoints.books()),
  getBook: (id) => req<Book>(endpoints.book(id)),
  estimate: (input) => req<Estimate>(endpoints.estimates(), { method: "POST", body: JSON.stringify(input) }),
  startJob: (input) => req<Job>(endpoints.jobs(), { method: "POST", body: JSON.stringify(input) }),
  listJobs: () => req<Job[]>(endpoints.jobs()),
  getJob: (id) => req<Job>(endpoints.job(id)),
  getJobEvents: (id) => req<JobEvent[]>(endpoints.events(id), { headers: { Accept: "application/json" } }),
  resumeJob: (id) => req<Job>(endpoints.resume(id), { method: "POST" }),
  getSummary: (id) => req<SummaryDoc>(endpoints.summary(id)),
  subscribe(id, onEvent, onJob) {
    // Prefer SSE; fall back to polling every 2s if unavailable.
    let closed = false;
    let es: EventSource | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    const seen = new Set<string>();
    const poll = async () => {
      try {
        const [job, events] = await Promise.all([httpClient.getJob(id), httpClient.getJobEvents(id)]);
        if (closed) return;
        events.forEach((e) => !seen.has(e.id) && (seen.add(e.id), onEvent(e)));
        onJob(job);
        if (["completed", "failed", "interrupted"].includes(job.status) && timer) clearInterval(timer);
      } catch {
        /* keep polling */
      }
    };
    try {
      es = new EventSource(API_BASE_URL.replace(/\/$/, "") + endpoints.events(id));
      es.onmessage = (m) => {
        const e = JSON.parse(m.data) as JobEvent;
        if (!seen.has(e.id)) (seen.add(e.id), onEvent(e));
        httpClient.getJob(id).then((j) => !closed && onJob(j)).catch(() => {});
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (!timer && !closed) timer = setInterval(poll, 2000);
      };
    } catch {
      timer = setInterval(poll, 2000);
    }
    return () => {
      closed = true;
      es?.close();
      if (timer) clearInterval(timer);
    };
  },
  async exportFile(id, format) {
    const res = await fetch(API_BASE_URL.replace(/\/$/, "") + endpoints.export(id, format));
    if (!res.ok) throw new Error(`Export failed (${res.status})`);
    const content = await res.text();
    return {
      filename: `${id}.${format === "json" ? "json" : "md"}`,
      content,
      mime: format === "json" ? "application/json" : "text/markdown",
    };
  },
};
