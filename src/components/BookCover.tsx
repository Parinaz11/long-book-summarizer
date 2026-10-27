import type { Book } from "@/lib/types";
import { LANGUAGES } from "@/lib/config";
import { cn } from "@/lib/utils";

export function BookCover({ book, className, size = "md" }: { book: Book; className?: string; size?: "sm" | "md" | "lg" }) {
  const [a, b] = book.cover.palette;
  const dir = LANGUAGES[book.language].dir;
  if (book.cover.imageUrl) {
    return (
      <img
        src={book.cover.imageUrl}
        alt={`Cover of ${book.title}`}
        className={cn("aspect-[2/3] w-full rounded-sm object-cover shadow-book", className)}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={`Cover of ${book.title}`}
      dir={dir}
      className={cn(
        "relative aspect-[2/3] w-full overflow-hidden rounded-[3px] shadow-book select-none",
        className,
      )}
      style={{ background: a, color: b }}
    >
      <div className="paper-grain absolute inset-0 opacity-60" />
      {/* spine shading */}
      <div
        className="absolute inset-y-0 w-3 opacity-40"
        style={{ [dir === "rtl" ? "right" : "left"]: 0, background: "linear-gradient(90deg, rgb(0 0 0 / .35), transparent)" }}
      />
      <div className="absolute inset-[7%] flex flex-col border" style={{ borderColor: `color-mix(in oklab, ${b} 55%, transparent)` }}>
        <div className="flex flex-1 flex-col items-center justify-center px-[8%] text-center">
          <span className="mb-[8%] block h-px w-1/4" style={{ background: b }} />
          <span
            className={cn(
              "font-display leading-[1.08] font-medium text-balance",
              size === "sm" ? "text-[11px]" : size === "lg" ? "text-2xl" : "text-base sm:text-lg",
            )}
          >
            {book.title}
          </span>
          <span className="mt-[8%] block h-px w-1/4" style={{ background: b }} />
        </div>
        <div
          className={cn(
            "pb-[8%] text-center tracking-[0.18em] uppercase opacity-85",
            size === "sm" ? "text-[6px]" : size === "lg" ? "text-xs" : "text-[9px]",
          )}
        >
          {book.author}
        </div>
      </div>
    </div>
  );
}
