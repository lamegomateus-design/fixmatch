"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  faceValue: number;
  currentPU: number;
  offeredPU: number;
}

export function PUComparison({ faceValue, currentPU, offeredPU }: Props) {
  const max = Math.max(faceValue, currentPU, offeredPU) * 1.04;
  const bars = [
    { label: "Valor de Face", value: faceValue, color: "hsl(140 10% 50%)" },
    { label: "PU Atual (mark)", value: currentPU, color: "hsl(199 89% 55%)" },
    {
      label: "PU Ofertado",
      value: offeredPU,
      color: offeredPU < currentPU ? "hsl(142 80% 48%)" : "hsl(38 92% 55%)",
      highlight: true,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparação de PU</CardTitle>
        <div className="text-xs text-muted-foreground mt-1">
          Face Value vs. mark-to-market vs. oferta atual
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {bars.map((b) => {
          const width = (b.value / max) * 100;
          return (
            <div key={b.label}>
              <div className="flex justify-between items-baseline mb-1">
                <span className={cn("text-xs", b.highlight && "text-primary font-semibold")}>
                  {b.label}
                </span>
                <span className="font-mono text-sm tabular-nums">
                  R$ {b.value.toFixed(2)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${width}%`,
                    background: b.color,
                  }}
                />
              </div>
            </div>
          );
        })}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-terminal-border bg-terminal-bg/40 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Δ vs. PU atual
            </div>
            <div
              className={cn(
                "font-mono tabular-nums text-sm",
                offeredPU < currentPU ? "text-positive" : "text-warning",
              )}
            >
              {(((offeredPU - currentPU) / currentPU) * 100).toFixed(2)}%
            </div>
          </div>
          <div className="rounded-md border border-terminal-border bg-terminal-bg/40 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Δ vs. face value
            </div>
            <div
              className={cn(
                "font-mono tabular-nums text-sm",
                offeredPU < faceValue ? "text-positive" : "text-warning",
              )}
            >
              {(((offeredPU - faceValue) / faceValue) * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
