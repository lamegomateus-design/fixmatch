"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { name: "Debênture", value: 32, color: "hsl(38 92% 55%)" },
  { name: "CDB", value: 21, color: "hsl(199 89% 55%)" },
  { name: "CRI", value: 14, color: "hsl(142 80% 48%)" },
  { name: "CRA", value: 12, color: "hsl(160 70% 45%)" },
  { name: "Tesouro", value: 11, color: "hsl(140 15% 60%)" },
  { name: "LCI/LCA", value: 10, color: "hsl(142 50% 30%)" },
];

export function AssetMixChart() {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={48}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            stroke="hsl(150 28% 6%)"
            strokeWidth={2}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(150 28% 6%)",
              border: "1px solid hsl(150 18% 14%)",
              borderRadius: 6,
              fontSize: 12,
              color: "hsl(140 15% 92%)",
            }}
            formatter={(v: number) => [`${v}%`, "Participação"]}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="space-y-1.5 text-xs">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 font-mono tabular-nums">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-muted-foreground w-20">{d.name}</span>
            <span className="text-foreground">{d.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
