import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { downloadText } from "@/lib/queries";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/read/$jobId")({
  head: () => ({ meta: [{ title: "Summary reader — Chapterly" }, { name: "description", content: "Summary reader in Chapterly." }, { property: "og:title", content: "Summary reader — Chapterly" }, { property: "og:description", content: "Summary reader in Chapterly." }] }),
  component: Page,
});

function Page() {
  const { jobId } = useParams({ from: "/read/$jobId" });
  const summary = useQuery({ queryKey: ["summary", jobId], queryFn: () => api.getSummary(jobId) });
  const doc = summary.data;
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        {summary.isLoading && <p className="text-muted-foreground">Loading summary…</p>}
        {summary.isError && <p className="text-destructive">{(summary.error as Error).message}</p>}
        {doc && <article dir={doc.book.language === "fa" ? "rtl" : "ltr"} className="text-left">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-sm text-muted-foreground">Summary</p><h1 className="font-display mt-1 text-4xl">{doc.book.title}</h1></div>
            <div className="flex gap-2"><Button variant="outline" onClick={async () => { const f = await api.exportFile(jobId, "json"); downloadText(f.filename, f.content, f.mime); }}>JSON</Button><Button variant="outline" onClick={async () => { const f = await api.exportFile(jobId, "markdown"); downloadText(f.filename, f.content, f.mime); }}>Markdown</Button></div>
          </div>
          <section className="mt-10 rounded-2xl bg-secondary p-6"><h2 className="font-display text-2xl">Overview</h2><p className="mt-4 whitespace-pre-wrap leading-8">{doc.overview?.overview}</p></section>
          <div className="mt-10 space-y-8">{doc.chapters.map((chapter) => <section key={chapter.index} className="border-b border-border pb-8"><p className="text-sm text-muted-foreground">{chapter.heading ?? `Chapter ${chapter.index}`}</p><h2 className="font-display mt-1 text-2xl">{chapter.title}</h2><p className="mt-3 whitespace-pre-wrap leading-8">{chapter.summary}</p>{chapter.sections?.map((section) => <div key={section.index} className="mt-4"><h3 className="font-medium">{section.title}</h3><p className="mt-1 whitespace-pre-wrap leading-7 text-muted-foreground">{section.summary}</p></div>)}</section>)}</div>
        </article>}
      </main>
    </div>
  );
}
