import { CheckCircle2, CircleDashed, Loader2, PauseCircle, XCircle } from "lucide-react";
import type { JobStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

const styles: Record<JobStatus, string> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-accent text-accent-foreground",
  completed: "bg-success-soft text-success",
  failed: "bg-destructive/10 text-destructive",
  interrupted: "bg-warning-soft text-warning",
};
const icons = { queued: CircleDashed, running: Loader2, completed: CheckCircle2, failed: XCircle, interrupted: PauseCircle };

export function StatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  const Icon = icons[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", styles[status], className)}>
      <Icon className={cn("size-3.5", status === "running" && "animate-spin")} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}
