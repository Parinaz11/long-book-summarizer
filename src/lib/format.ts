import type { JobEvent, JobStatus } from "./types";

export const usd = (n?: number) =>
  n == null ? "—" : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(n < 1 ? 3 : 2)}`;

export const tokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : `${n}`);

export const duration = (sec: number) => {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
};

export const date = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

export const time = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export const STATUS_LABEL: Record<JobStatus, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  interrupted: "Interrupted",
};

export type EventTone = "info" | "progress" | "success" | "warning" | "error";

/** Translate raw backend events into readable messages. */
export function describeEvent(e: JobEvent): { text: string; tone: EventTone } {
  const ch = e.chapter != null ? `Chapter ${e.chapter}` : "a chapter";
  switch (e.type) {
    case "job.queued":
      return { text: "Waiting in the queue", tone: "info" };
    case "job.started":
      return { text: "Summarization started", tone: "info" };
    case "structure.analyzing":
      return { text: "Analyzing book structure", tone: "info" };
    case "structure.detected":
      return { text: `Found ${e.totalChapters ?? "the"} chapters`, tone: "info" };
    case "chapter.started":
      return { text: `Processing ${ch}`, tone: "progress" };
    case "chapter.completed":
      return { text: `${ch} completed`, tone: "success" };
    case "llm.retry":
      return { text: "A temporary API issue occurred. Retrying…", tone: "warning" };
    case "overview.started":
      return { text: "Generating the book overview", tone: "progress" };
    case "validation.started":
      return { text: "Validating the final summary", tone: "progress" };
    case "job.completed":
      return { text: "Summary completed successfully", tone: "success" };
    case "job.failed":
      return { text: e.message ?? "The job stopped with an error", tone: "error" };
    default:
      return { text: e.message ?? String(e.type), tone: "info" };
  }
}
