import type { Book, Estimate, Job, JobEvent, LanguageCode, SummaryDoc } from "../types";

export type ExportFormat = "json" | "markdown";

/** Every UI call goes through this interface, so the backend can change without UI rewrites. */
export interface ApiClient {
  listBooks(): Promise<Book[]>;
  getBook(id: string): Promise<Book>;
  estimate(input: { bookId: string; summaryLanguage: LanguageCode }): Promise<Estimate>;
  startJob(input: { bookId: string; summaryLanguage: LanguageCode; acceptedEstimateUsd: number }): Promise<Job>;
  listJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job>;
  getJobEvents(id: string): Promise<JobEvent[]>;
  /** Live events. Returns an unsubscribe function. */
  subscribe(id: string, onEvent: (e: JobEvent) => void, onJob: (j: Job) => void): () => void;
  resumeJob(id: string): Promise<Job>;
  getSummary(id: string): Promise<SummaryDoc>;
  exportFile(id: string, format: ExportFormat): Promise<{ filename: string; content: string; mime: string }>;
}
