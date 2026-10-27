import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Clock, Coins, Languages, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookCover } from "./BookCover";
import { api } from "@/lib/api";
import { DEMO_MODE, LANGUAGES } from "@/lib/config";
import { duration, tokens, usd } from "@/lib/format";
import type { Book, LanguageCode } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SummarizeDialog({ book, onOpenChange }: { book: Book | null; onOpenChange: (o: boolean) => void }) {
  const [lang, setLang] = useState<LanguageCode>("en");
  useEffect(() => {
    if (book) setLang(book.language);
  }, [book]);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const est = useQuery({
    queryKey: ["estimate", book?.id, lang],
    queryFn: () => api.estimate({ bookId: book!.id, summaryLanguage: lang }),
    enabled: !!book,
    retry: false,
  });

  const start = useMutation({
    mutationFn: () => api.startJob({ bookId: book!.id, summaryLanguage: lang, acceptedEstimateUsd: est.data!.estimatedCostUsd }),
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      onOpenChange(false);
      navigate({ to: "/jobs/$jobId", params: { jobId: job.id } });
    },
  });

  return (
    <Dialog open={!!book} onOpenChange={(o) => !start.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden bg-paper p-0 sm:rounded-2xl">
        {book && (
          <>
            <div className="bg-hero flex gap-5 border-b border-border p-6">
              <BookCover book={book} size="sm" className="w-20 shrink-0" />
              <div className="min-w-0 self-center">
                <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Summarize</p>
                <DialogTitle dir={LANGUAGES[book.language].dir} className="font-display mt-1 text-2xl leading-tight">
                  {book.title}
                </DialogTitle>
                <DialogDescription className="mt-1">{book.author}</DialogDescription>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Languages className="size-3.5" /> Source language
                  </p>
                  <p className="mt-1 font-medium">{LANGUAGES[book.language].label}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <label htmlFor="sumlang" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Languages className="size-3.5" /> Summary language
                  </label>
                  <select
                    id="sumlang"
                    value={lang}
                    onChange={(e) => setLang(e.target.value as LanguageCode)}
                    className="mt-1 w-full bg-transparent font-medium focus:outline-none"
                  >
                    {Object.entries(LANGUAGES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label} {k === book.language ? "(matches book)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl bg-secondary p-5">
                {est.isLoading ? (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Calculating estimate…
                  </div>
                ) : est.isError ? (
                  <div className="flex gap-3 text-destructive" role="alert">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <div>
                      <p className="font-medium">We couldn't get a cost estimate.</p>
                      <p className="mt-0.5 text-sm opacity-80">{(est.error as Error).message}</p>
                      <button onClick={() => est.refetch()} className="mt-2 text-sm underline underline-offset-2">
                        Try again
                      </button>
                    </div>
                  </div>
                ) : est.data ? (
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Coins className="size-3.5" /> Estimated cost
                      </p>
                      <p className="font-display mt-1 text-4xl font-medium">{usd(est.data.estimatedCostUsd)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        ~{tokens(est.data.estimatedPromptTokens)} input · ~{tokens(est.data.estimatedOutputTokens)} output tokens
                        {est.data.chapterCount ? ` · ${est.data.chapterCount} chapters` : ""}
                      </p>
                    </div>
                    {est.data.estimatedSeconds && (
                      <div className="text-end">
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="size-3.5" /> Est. time
                        </p>
                        <p className="mt-1 text-lg font-medium">~{duration(est.data.estimatedSeconds)}</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                This is an estimate based on the book's length and current model pricing; the final amount may differ slightly.
                Confirming does not charge you — it only acknowledges the estimated cost.
                {DEMO_MODE && " Demo mode: figures use sample pricing and nothing is processed."}
              </p>
              {start.isError && (
                <p className="text-sm text-destructive" role="alert">
                  {(start.error as Error).message}
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border bg-background/60 p-4 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={start.isPending}>
                Cancel
              </Button>
              <Button
                onClick={() => start.mutate()}
                disabled={!est.data || start.isPending}
                className={cn("rounded-full px-5")}
              >
                {start.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirm and summarize
                {!start.isPending && <ArrowRight className="size-4" />}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
