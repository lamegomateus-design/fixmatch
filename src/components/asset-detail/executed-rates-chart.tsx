"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExecutedRatePoint } from "@/types";

interface Props {
  data: ExecutedRatePoint[];
}

export function ExecutedRatesChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
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
          yAxisId="left"
          stroke="hsl(140 10% 45%)"
          tick={{ fontSize: 10, fontFamily: "ui-monospace" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
          domain={["dataMin - 0.005", "dataMax + 0.005"]}
          width={50}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="hsl(140 10% 45%)"
          tick={{ fontSize: 10, fontFamily: "ui-monospace" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(150 28% 6%)",
            border: "1px solid hsl(150 18% 14%)",
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(v: number, name: string) => {
            if (name === "rate") return [`${(v * 100).toFixed(2)}%`, "Taxa executada"];
            return [`R$ ${v.toLocaleString("pt-BR")}`, "Volume"];
          }}
          labelStyle={{ color: "hsl(140 10% 60%)", fontSize: 10 }}
        />
        <Bar
          yAxisId="right"
          dataKey="volume"
          fill="hsl(150 18% 18%)"
          radius={[2, 2, 0, 0]}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="rate"
          stroke="hsl(142 80% 48%)"
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(142 80% 48%)", strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
