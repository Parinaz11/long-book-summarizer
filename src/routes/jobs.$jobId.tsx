import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { api } from "@/lib/api";
import type { Job, JobEvent } from "@/lib/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/jobs/$jobId")({
  head: () => ({ meta: [{ title: "Summarization in progress — Chapterly" }, { name: "description", content: "Summarization in progress in Chapterly." }, { property: "og:title", content: "Summarization in progress — Chapterly" }, { property: "og:description", content: "Summarization in progress in Chapterly." }] }),
  component: Page,
});

function Page() {
  const { jobId } = useParams({ from: "/jobs/$jobId" });
  const navigate = useNavigate();
  const [job, setJob] = useState<Job>();
  const [events, setEvents] = useState<JobEvent[]>([]);
  useEffect(() => api.subscribe(jobId, (event) => setEvents((current) => current.some((item) => item.id === event.id) ? current : [...current, event]), (next) => {
    setJob(next);
    if (next.status === "completed") navigate({ to: "/read/$jobId", params: { jobId } });
  }), [jobId, navigate]);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-display text-4xl">{job?.status === "failed" ? "Summarization failed" : "Summarization in progress"}</h1>
        <p className="mt-3 text-muted-foreground">{job?.error ?? `${job?.completedChapters ?? 0} chapters completed.`}</p>
        <div className="mt-8 rounded-xl border border-border bg-background p-4 text-left">
          <p className="mb-3 text-sm font-medium">Activity</p>
          <div className="max-h-96 space-y-2 overflow-auto text-sm text-muted-foreground">
            {events.map((event) => <p key={event.id}>{event.message ?? event.type.replaceAll(".", " ")}</p>)}
          </div>
        </div>
        {job?.status === "failed" && <Button className="mt-6" onClick={() => navigate({ to: "/" })}>Back to library</Button>}
      </main>
    </div>
  );
}
