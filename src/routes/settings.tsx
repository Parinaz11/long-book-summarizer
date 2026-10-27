import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Chapterly" }, { name: "description", content: "Settings in Chapterly." }, { property: "og:title", content: "Settings — Chapterly" }, { property: "og:description", content: "Settings in Chapterly." }] }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-display text-4xl">Settings</h1>
        <p className="mt-3 text-muted-foreground">This page is not finished yet.</p>
      </main>
    </div>
  );
}
