import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BookCard } from "@/components/BookCard";
import { SummarizeDialog } from "@/components/SummarizeDialog";
import { booksQuery } from "@/lib/queries";
import type { Book } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chapterly — Great books, clearly understood" },
      { name: "description", content: "Browse a library of books and generate structured AI summaries in English and Persian." },
      { property: "og:title", content: "Chapterly — Great books, clearly understood" },
      { property: "og:description", content: "Browse books and generate structured AI summaries." },
    ],
  }),
  component: Library,
});

function Library() {
  const { data, isLoading, isError } = useQuery(booksQuery());
  const [q, setQ] = useState("");
  const [lang, setLang] = useState("all");
  const [selected, setSelected] = useState<Book | null>(null);
  const books = useMemo(
    () => (data ?? []).filter((b) => (lang === "all" || b.language === lang) && (b.title + b.author).toLowerCase().includes(q.toLowerCase())),
    [data, q, lang],
  );
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="bg-hero border-b border-border">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">The library</p>
          <h1 className="font-display mt-3 max-w-2xl text-5xl leading-[1.05] font-medium sm:text-6xl">Great books, clearly understood.</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">Pick a book, see the estimated cost, and read a chapter-by-chapter summary in its own language.</p>
          <div className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 items-center gap-2 rounded-full border border-input bg-paper px-4 py-2.5 shadow-soft">
              <Search className="size-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title or author" className="w-full bg-transparent focus:outline-none" />
            </label>
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-full border border-input bg-paper px-4 py-2.5" aria-label="Language">
              <option value="all">All languages</option>
              <option value="en">English</option>
              <option value="fa">Persian</option>
            </select>
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        {isLoading && <p className="text-muted-foreground">Loading books…</p>}
        {isError && <p className="text-destructive">Couldn't load the library.</p>}
        {data && books.length === 0 && <p className="text-muted-foreground">No books match your search.</p>}
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.map((b, i) => <BookCard key={b.id} book={b} index={i} onSummarize={setSelected} />)}
        </div>
      </main>
      <SummarizeDialog book={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
