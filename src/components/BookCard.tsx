import { Link } from "@tanstack/react-router";
import { BookOpenText, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCover } from "./BookCover";
import { LANGUAGES } from "@/lib/config";
import type { Book } from "@/lib/types";

export function BookCard({ book, onSummarize, index = 0 }: { book: Book; onSummarize: (b: Book) => void; index?: number }) {
  const dir = LANGUAGES[book.language].dir;
  return (
    <article className="group animate-rise flex flex-col" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="relative rounded-xl bg-secondary/70 px-[14%] pt-8 pb-6 transition-colors group-hover:bg-accent/60">
        <div className="transition-transform duration-500 group-hover:-translate-y-1.5 group-hover:-rotate-1">
          <BookCover book={book} />
        </div>
        {book.latestSummaryJobId && (
          <span className="absolute top-3 end-3 inline-flex items-center gap-1 rounded-full bg-paper/90 px-2 py-0.5 text-[11px] font-medium text-success shadow-soft">
            <CheckCircle2 className="size-3" /> Summarized
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-4">
        <div className="flex items-center gap-2 text-[11px] tracking-wider text-muted-foreground uppercase">
          <span>{LANGUAGES[book.language].label}</span>
          {book.genre && (
            <>
              <span aria-hidden>·</span>
              <span dir={dir}>{book.genre}</span>
            </>
          )}
        </div>
        <h3 dir={dir} className="font-display mt-1.5 text-xl leading-snug font-medium">
          {book.title}
        </h3>
        <p dir={dir} className="text-sm text-muted-foreground">
          {book.author}
          {book.year ? ` · ${book.year}` : ""}
        </p>
        {book.description && (
          <p dir={dir} className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/75">
            {book.description}
          </p>
        )}
        <div className="mt-auto flex gap-2 pt-4">
          <Button onClick={() => onSummarize(book)} disabled={!!book.latestSummaryJobId} className="flex-1 rounded-full" variant={book.latestSummaryJobId ? "outline" : "default"}>
            <Sparkles className="size-4" /> {book.latestSummaryJobId ? "Already summarized" : "Summarize"}
          </Button>
          {book.latestSummaryJobId && (
            <Button asChild className="rounded-full">
              <Link to="/read/$jobId" params={{ jobId: book.latestSummaryJobId }}>
                <BookOpenText className="size-4" /> Read
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
