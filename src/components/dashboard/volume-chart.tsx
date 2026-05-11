"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { d: "01/05", v: 11.2 },
  { d: "02/05", v: 12.4 },
  { d: "03/05", v: 9.8 },
  { d: "04/05", v: 14.6 },
  { d: "05/05", v: 17.1 },
  { d: "06/05", v: 15.2 },
  { d: "07/05", v: 21.4 },
  { d: "08/05", v: 19.7 },
  { d: "09/05", v: 24.3 },
  { d: "10/05", v: 28.6 },
];

export function VolumeChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradVol" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(142 80% 48%)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="hsl(142 80% 48%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(150 18% 14%)" vertical={false} strokeDasharray="2 4" />
        <XAxis
          dataKey="d"
          stroke="hsl(140 10% 45%)"
          tick={{ fontSize: 10, fontFamily: "ui-monospace" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="hsl(140 10% 45%)"
          tick={{ fontSize: 10, fontFamily: "ui-monospace" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}M`}
          width={42}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(150 28% 6%)",
            border: "1px solid hsl(150 18% 14%)",
            borderRadius: 6,
            fontSize: 12,
            color: "hsl(140 15% 92%)",
          }}
          formatter={(v: number) => [`R$ ${v.toFixed(1)}M`, "Volume"]}
          labelStyle={{ color: "hsl(140 10% 60%)", fontSize: 10 }}
        />
        <Area
          type="monotone"
          dataKey="v"
          stroke="hsl(142 80% 48%)"
          strokeWidth={2}
          fill="url(#gradVol)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
