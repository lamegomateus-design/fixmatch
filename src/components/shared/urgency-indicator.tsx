import { cn } from "@/lib/utils";
import type { Urgency } from "@/types";

const urgencyDot: Record<Urgency, string> = {
  Baixa: "bg-muted-foreground",
  Média: "bg-warning",
  Alta: "bg-destructive animate-pulse",
};

const urgencyText: Record<Urgency, string> = {
  Baixa: "text-muted-foreground",
  Média: "text-warning",
  Alta: "text-destructive",
};

export function UrgencyIndicator({
  urgency,
  className,
}: {
  urgency: Urgency;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider",
        urgencyText[urgency],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", urgencyDot[urgency])} />
      {urgency}
    </span>
  );
}
