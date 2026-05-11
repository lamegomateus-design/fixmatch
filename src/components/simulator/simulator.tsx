"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Calculator, Equal, Percent, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CDI_ANNUAL,
  daysBetween,
  formatCurrency,
  formatPercent,
  runBuyerSimulation,
} from "@/lib/finance";
import type { IndexerType } from "@/types";

const TAX_BRACKETS = [
  { value: 0.225, label: "22,5% · até 180d" },
  { value: 0.2, label: "20% · 181 – 360d" },
  { value: 0.175, label: "17,5% · 361 – 720d" },
  { value: 0.15, label: "15% · 720d+" },
  { value: 0, label: "Isento (LCI/LCA/CRI/CRA)" },
];

const INDEXERS: IndexerType[] = ["Pré", "CDI", "IPCA+", "Selic"];

export function Simulator() {
  const [purchasePU, setPurchasePU] = React.useState(932.5);
  const [faceValue, setFaceValue] = React.useState(1000);
  const [maturity, setMaturity] = React.useState("2027-06-15");
  const [rate, setRate] = React.useState(0.142);
  const [indexer, setIndexer] = React.useState<IndexerType>("Pré");
  const [taxBracket, setTaxBracket] = React.useState(0.15);
  const [desiredReturn, setDesiredReturn] = React.useState(0.14);
  const [puSlider, setPuSlider] = React.useState([932.5]);

  React.useEffect(() => {
    setPurchasePU(puSlider[0]);
  }, [puSlider]);

  const result = runBuyerSimulation({
    purchasePU,
    faceValue,
    maturity,
    rate,
    indexer,
    taxBracket,
    desiredReturn,
  });

  const ratesComparison = [
    {
      name: "Poupança",
      value: 0.0707,
      color: "hsl(140 10% 50%)",
    },
    {
      name: "CDI",
      value: CDI_ANNUAL,
      color: "hsl(199 89% 55%)",
    },
    {
      name: "Selic",
      value: 0.1125,
      color: "hsl(160 70% 45%)",
    },
    {
      name: "Esta Oferta",
      value: result.annualizedYield,
      color: "hsl(142 80% 48%)",
    },
  ];

  const cdiRatio = result.vsCDI;
  const meetsDesired = result.annualizedYield >= desiredReturn;
  const days = daysBetween(new Date("2026-05-11T00:00:00Z"), maturity);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-3.5 w-3.5" /> Parâmetros da Operação
            </CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Configure os dados da operação para simular retorno, comparações e
              preço de equilíbrio.
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>PU de Compra</Label>
                <span className="font-mono text-base text-primary tabular-nums">
                  R$ {purchasePU.toFixed(2)}
                </span>
              </div>
              <Slider
                value={puSlider}
                onValueChange={(v) => setPuSlider([v[0]])}
                min={faceValue * 0.6}
                max={faceValue * 1.05}
                step={0.5}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>R$ {(faceValue * 0.6).toFixed(0)}</span>
                <span>R$ {(faceValue * 0.825).toFixed(0)}</span>
                <span>R$ {(faceValue * 1.05).toFixed(0)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Valor de Face (R$)</Label>
                <Input
                  type="number"
                  value={faceValue}
                  onChange={(e) => setFaceValue(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={maturity}
                  onChange={(e) => setMaturity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cupom / Taxa Nominal (% a.a.)</Label>
                <Input
                  type="number"
                  step={0.01}
                  value={(rate * 100).toFixed(2)}
                  onChange={(e) => setRate((Number(e.target.value) || 0) / 100)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Indexador</Label>
                <Select value={indexer} onValueChange={(v) => setIndexer(v as IndexerType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INDEXERS.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Alíquota IR</Label>
                <Select
                  value={String(taxBracket)}
                  onValueChange={(v) => setTaxBracket(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_BRACKETS.map((b) => (
                      <SelectItem key={b.value} value={String(b.value)}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Retorno desejado (% a.a.)</Label>
                <Input
                  type="number"
                  step={0.01}
                  value={(desiredReturn * 100).toFixed(2)}
                  onChange={(e) =>
                    setDesiredReturn((Number(e.target.value) || 0) / 100)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparação vs. Benchmarks</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Taxa anualizada bruta · base 252 du
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={ratesComparison}
                margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="hsl(150 18% 14%)" vertical={false} strokeDasharray="2 4" />
                <XAxis
                  dataKey="name"
                  stroke="hsl(140 10% 60%)"
                  tick={{ fontSize: 11, fontFamily: "ui-monospace" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(140 10% 45%)"
                  tick={{ fontSize: 10, fontFamily: "ui-monospace" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(150 28% 6%)",
                    border: "1px solid hsl(150 18% 14%)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${(v * 100).toFixed(2)}%`, "Taxa"]}
                />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {ratesComparison.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Análise de Preço</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Preço de equilíbrio (break-even) e cenários
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="breakeven">
              <TabsList>
                <TabsTrigger value="breakeven">Break-even</TabsTrigger>
                <TabsTrigger value="scenarios">Cenários</TabsTrigger>
              </TabsList>
              <TabsContent value="breakeven" className="space-y-3 text-sm">
                <div className="rounded-md border border-terminal-border bg-terminal-bg/40 p-4">
                  <div className="text-xs text-muted-foreground mb-1">
                    Preço de equilíbrio (PU que iguala CDI)
                  </div>
                  <div className="text-2xl font-mono tabular-nums text-foreground">
                    R$ {result.breakEvenPrice.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Acima disso → operação rende abaixo do CDI · abaixo → bate CDI.
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Pill
                    label="Comprando 1% abaixo BE"
                    value={`R$ ${(result.breakEvenPrice * 0.99).toFixed(2)}`}
                  />
                  <Pill
                    label="Break-even"
                    value={`R$ ${result.breakEvenPrice.toFixed(2)}`}
                    highlight
                  />
                  <Pill
                    label="Comprando 1% acima BE"
                    value={`R$ ${(result.breakEvenPrice * 1.01).toFixed(2)}`}
                  />
                </div>
              </TabsContent>
              <TabsContent value="scenarios" className="space-y-3 text-sm">
                {[
                  { label: "PU −2%", factor: 0.98 },
                  { label: "PU atual", factor: 1.0, highlight: true },
                  { label: "PU +2%", factor: 1.02 },
                  { label: "PU +5%", factor: 1.05 },
                ].map((s) => {
                  const pu = purchasePU * s.factor;
                  const sim = runBuyerSimulation({
                    purchasePU: pu,
                    faceValue,
                    maturity,
                    rate,
                    indexer,
                    taxBracket,
                  });
                  return (
                    <div
                      key={s.label}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                        s.highlight ? "border-primary/40 bg-primary/[0.04]" : "border-terminal-border bg-terminal-bg/40"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          {s.label}
                        </span>
                        <span className="font-mono tabular-nums">R$ {pu.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-primary tabular-nums">
                          {formatPercent(sim.annualizedYield)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {sim.vsCDI.toFixed(2)}x CDI
                        </span>
                      </div>
                    </div>
                  );
                })}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.05] to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Resultado da Simulação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-primary/30 bg-primary/[0.05] p-4 text-center">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary">
                Taxa Anualizada
              </div>
              <div className="text-4xl font-mono tabular-nums text-primary font-semibold mt-1">
                {formatPercent(result.annualizedYield)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                em {days} dias · {(days / 365).toFixed(2)} anos
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded-sm ${
                    cdiRatio >= 1 ? "bg-positive/15 text-positive" : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {cdiRatio.toFixed(2)}x CDI
                </span>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded-sm ${
                    meetsDesired ? "bg-positive/15 text-positive" : "bg-warning/15 text-warning"
                  }`}
                >
                  {meetsDesired ? "✓ atinge desejado" : "abaixo do desejado"}
                </span>
              </div>
            </div>

            <Separator />

            <Row
              icon={<TrendingUp className="h-3.5 w-3.5 text-positive" />}
              label="Lucro bruto"
              value={formatCurrency(result.grossReturn, 2)}
              positive
            />
            <Row
              icon={<Percent className="h-3.5 w-3.5 text-warning" />}
              label={`Imposto de renda (${(taxBracket * 100).toFixed(1)}%)`}
              value={formatCurrency(result.grossReturn - result.netReturn, 2)}
              tone="warning"
            />
            <Row
              icon={<Equal className="h-3.5 w-3.5 text-primary" />}
              label="Lucro líquido"
              value={formatCurrency(result.netReturn, 2)}
              positive
              highlight
            />
            <Separator />
            <Row label="Investimento inicial" value={formatCurrency(purchasePU, 2)} />
            <Row label="Valor no vencimento" value={formatCurrency(faceValue, 2)} />
            <Row
              label="Retorno sobre investimento"
              value={`${((result.netReturn / purchasePU) * 100).toFixed(2)}%`}
              positive
            />
            <Row label="Dias até vencimento" value={`${days}d`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo Executivo</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-muted-foreground leading-relaxed">
            <p>
              Comprando 1 unidade por <span className="text-foreground font-mono">R$ {purchasePU.toFixed(2)}</span>{" "}
              e recebendo <span className="text-foreground font-mono">R$ {faceValue.toFixed(2)}</span> no vencimento,
              a taxa implícita anualizada é de{" "}
              <span className="text-primary font-mono">{formatPercent(result.annualizedYield)}</span>.
            </p>
            <p>
              Isso representa <span className="text-foreground font-mono">{cdiRatio.toFixed(2)}x</span> o
              CDI atual de <span className="font-mono">{formatPercent(CDI_ANNUAL)}</span>. Após IR de{" "}
              <span className="font-mono">{(taxBracket * 100).toFixed(1)}%</span>, o lucro líquido é{" "}
              <span className="text-positive font-mono">{formatCurrency(result.netReturn, 2)}</span>.
            </p>
            <p>
              Preço de equilíbrio (paridade com CDI) ={" "}
              <span className="text-foreground font-mono">R$ {result.breakEvenPrice.toFixed(2)}</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  tone,
  positive,
  highlight,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  tone?: "warning";
  positive?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span
        className={`font-mono tabular-nums ${
          highlight
            ? "text-primary font-semibold text-base"
            : tone === "warning"
              ? "text-warning"
              : positive
                ? "text-positive"
                : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Pill({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border px-2 py-2 text-center ${
        highlight
          ? "border-primary/40 bg-primary/[0.05]"
          : "border-terminal-border bg-terminal-bg/40"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`font-mono tabular-nums mt-1 ${highlight ? "text-primary font-semibold" : ""}`}>
        {value}
      </div>
    </div>
  );
}
