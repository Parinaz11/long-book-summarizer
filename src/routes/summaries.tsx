import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { useQuery } from "@tanstack/react-query";
import { jobsQuery } from "@/lib/queries";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/summaries")({
  head: () => ({ meta: [{ title: "My Summaries — Chapterly" }, { name: "description", content: "My Summaries in Chapterly." }, { property: "og:title", content: "My Summaries — Chapterly" }, { property: "og:description", content: "My Summaries in Chapterly." }] }),
  component: Page,
});

function Page() {
  const jobs = useQuery(jobsQuery());
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-display text-4xl">My Summaries</h1>
        <div className="mt-8 space-y-3 text-left">{(jobs.data ?? []).filter((job) => job.status === "completed").map((job) => <Link key={job.id} to="/read/$jobId" params={{ jobId: job.id }} className="block rounded-xl border border-border p-4 hover:bg-secondary"><p className="font-medium">{job.bookId}</p><p className="text-sm text-muted-foreground">{job.finishedAt ? new Date(job.finishedAt).toLocaleString() : ""}</p></Link>)}</div>
      </main>
    </div>
  );
}
