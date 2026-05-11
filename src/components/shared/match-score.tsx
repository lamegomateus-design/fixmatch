import { cn } from "@/lib/utils";

function colorForScore(score: number): {
  ring: string;
  text: string;
  label: string;
} {
  if (score >= 80)
    return { ring: "bg-primary", text: "text-primary", label: "Excelente" };
  if (score >= 65)
    return { ring: "bg-positive", text: "text-positive", label: "Bom" };
  if (score >= 45)
    return { ring: "bg-warning", text: "text-warning", label: "Médio" };
  return { ring: "bg-destructive", text: "text-destructive", label: "Baixo" };
}

export function MatchScore({
  score,
  showLabel = false,
  size = "sm",
  className,
}: {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "lg";
  className?: string;
}) {
  const colors = colorForScore(score);
  const dim = size === "lg" ? 56 : 36;
  const stroke = size === "lg" ? 5 : 3;
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            stroke="hsl(var(--terminal-border))"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            className={cn("transition-all", colors.ring)}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 grid place-items-center font-mono font-semibold tabular-nums",
            size === "lg" ? "text-base" : "text-[11px]",
            colors.text,
          )}
        >
          {score}
        </span>
      </div>
      {showLabel ? (
        <div className="flex flex-col leading-tight">
          <span className={cn("text-xs font-semibold", colors.text)}>
            {colors.label}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Match Score
          </span>
        </div>
      ) : null}
    </div>
  );
}
