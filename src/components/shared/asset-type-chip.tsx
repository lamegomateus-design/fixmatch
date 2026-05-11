import type { AssetType } from "@/types";
import { cn } from "@/lib/utils";

const tone: Record<AssetType, string> = {
  CDB: "border-info/30 bg-info/10 text-info",
  LCI: "border-primary/30 bg-primary/10 text-primary",
  LCA: "border-primary/30 bg-primary/10 text-primary",
  Debênture: "border-warning/30 bg-warning/10 text-warning",
  CRI: "border-info/30 bg-info/10 text-info",
  CRA: "border-positive/30 bg-positive/10 text-positive",
  Tesouro: "border-terminal-border bg-secondary text-foreground",
};

export function AssetTypeChip({
  type,
  className,
}: {
  type: AssetType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-sm border px-1.5 py-0.5 text-[10px] font-mono font-semibold tracking-wider uppercase",
        tone[type],
        className,
      )}
    >
      {type}
    </span>
  );
}
