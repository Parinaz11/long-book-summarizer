import { queryOptions } from "@tanstack/react-query";
import { api } from "./api";

export const booksQuery = () => queryOptions({ queryKey: ["books"], queryFn: () => api.listBooks() });
export const bookQuery = (id: string) => queryOptions({ queryKey: ["book", id], queryFn: () => api.getBook(id) });
export const jobsQuery = () => queryOptions({ queryKey: ["jobs"], queryFn: () => api.listJobs() });
export const jobQuery = (id: string) => queryOptions({ queryKey: ["job", id], queryFn: () => api.getJob(id) });
export const summaryQuery = (id: string) =>
  queryOptions({ queryKey: ["summary", id], queryFn: () => api.getSummary(id), retry: false, staleTime: Infinity });

export function downloadText(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
