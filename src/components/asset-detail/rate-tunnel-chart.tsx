"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoricalRatePoint } from "@/types";

interface Props {
  data: HistoricalRatePoint[];
  offeredRate: number;
}

export function RateTunnelChart({ data, offeredRate }: Props) {
  const enriched = data.map((d) => ({
    ...d,
    range: [d.low, d.high] as [number, number],
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={enriched} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="tunnel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(142 80% 48%)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="hsl(142 80% 48%)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(150 18% 14%)" vertical={false} strokeDasharray="2 4" />
        <XAxis
          dataKey="date"
          stroke="hsl(140 10% 45%)"
          tick={{ fontSize: 10, fontFamily: "ui-monospace" }}
          tickFormatter={(d) => {
            const dt = new Date(d);
            return `${String(dt.getDate()).padStart(2, "0")}/${String(
              dt.getMonth() + 1,
            ).padStart(2, "0")}`;
          }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="hsl(140 10% 45%)"
          tick={{ fontSize: 10, fontFamily: "ui-monospace" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
          domain={["dataMin - 0.005", "dataMax + 0.005"]}
          width={50}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(150 28% 6%)",
            border: "1px solid hsl(150 18% 14%)",
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: "hsl(140 10% 60%)", fontSize: 10 }}
          formatter={(value: number | number[], name: string) => {
            if (Array.isArray(value)) {
              return [
                `${(value[0] * 100).toFixed(2)}% — ${(value[1] * 100).toFixed(2)}%`,
                "Túnel",
              ];
            }
            return [`${(value * 100).toFixed(2)}%`, name === "rate" ? "Taxa média" : name];
          }}
        />
        <Area
          type="monotone"
          dataKey="range"
          stroke="transparent"
          fill="url(#tunnel)"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="hsl(142 80% 48%)"
          strokeWidth={2}
          dot={false}
        />
        <ReferenceLine
          y={offeredRate}
          stroke="hsl(38 92% 55%)"
          strokeDasharray="4 4"
          label={{
            value: `Oferta · ${(offeredRate * 100).toFixed(2)}%`,
            position: "insideTopRight",
            fill: "hsl(38 92% 55%)",
            fontSize: 10,
            fontFamily: "ui-monospace",
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
