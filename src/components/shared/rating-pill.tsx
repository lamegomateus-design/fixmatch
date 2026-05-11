import { cn } from "@/lib/utils";
import type { RatingTier } from "@/types";

const ratingColor: Record<RatingTier, string> = {
  AAA: "bg-positive/15 text-positive border-positive/30",
  "AA+": "bg-positive/10 text-positive border-positive/30",
  AA: "bg-positive/10 text-positive border-positive/30",
  "AA-": "bg-info/10 text-info border-info/30",
  "A+": "bg-info/10 text-info border-info/30",
  A: "bg-info/10 text-info border-info/30",
  "A-": "bg-warning/10 text-warning border-warning/30",
  "BBB+": "bg-warning/10 text-warning border-warning/30",
  BBB: "bg-warning/10 text-warning border-warning/30",
  "BBB-": "bg-warning/15 text-warning border-warning/30",
  BB: "bg-destructive/10 text-destructive border-destructive/30",
  B: "bg-destructive/15 text-destructive border-destructive/30",
};

export function RatingPill({
  rating,
  className,
}: {
  rating: RatingTier;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-sm border px-1.5 py-0.5 text-[10px] font-mono tracking-wider font-semibold",
        ratingColor[rating],
        className,
      )}
    >
      {rating}
    </span>
  );
}
