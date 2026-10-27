import { Link } from "@tanstack/react-router";
import { BookOpen, FlaskConical } from "lucide-react";
import { BRAND, DEMO_MODE } from "@/lib/config";

const nav = [
  { to: "/", label: "Library" },
  { to: "/summaries", label: "My Summaries" },
  { to: "/settings", label: "Settings" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      {DEMO_MODE && (
        <div className="flex items-center justify-center gap-2 bg-ink px-4 py-1.5 text-center text-xs text-primary-foreground">
          <FlaskConical className="size-3.5 shrink-0" aria-hidden />
          <span>
            Demo mode — sample data, simulated processing, no real costs.{" "}
            <Link to="/settings" className="underline underline-offset-2">
              Learn more
            </Link>
          </span>
        </div>
      )}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
            <BookOpen className="size-4" aria-hidden />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">{BRAND.name}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
