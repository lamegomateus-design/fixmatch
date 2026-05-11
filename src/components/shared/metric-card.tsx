import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  footnote?: string;
  icon?: React.ReactNode;
  accent?: "primary" | "neutral";
}

export function MetricCard({
  label,
  value,
  delta,
  footnote,
  icon,
  accent = "neutral",
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        accent === "primary" &&
          "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent",
      )}
    >
      <div
        className={cn(
          "absolute top-0 left-0 h-full w-[3px]",
          accent === "primary" ? "bg-primary" : "bg-terminal-border",
        )}
      />
      <CardContent className="p-4 md:p-5 pt-4 md:pt-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
            {label}
          </span>
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </div>
        <div className="text-2xl md:text-[28px] font-semibold tracking-tight tabular-nums leading-none">
          {value}
        </div>
        {delta || footnote ? (
          <div className="mt-3 flex items-center gap-2 text-xs">
            {delta ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-mono tabular-nums",
                  delta.positive ? "text-positive" : "text-negative",
                )}
              >
                {delta.positive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {delta.value}
              </span>
            ) : null}
            {footnote ? (
              <span className="text-muted-foreground">{footnote}</span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
