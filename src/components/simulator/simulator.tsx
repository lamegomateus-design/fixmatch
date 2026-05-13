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
import {
  Calculator,
  Equal,
  Percent,
  Scale,
  Sparkles,
  TrendingUp,
} from "lucide-react";
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
import { formatCurrency, formatPercent } from "@/lib/finance";
import { CDI_ANUAL, IPCA_ANUAL, SELIC_ANUAL, VNA_BASE } from "@/lib/finance/constants";
import {
  calcularPU_PreFixado,
  calcularPU_CDI,
  calcularPU_IPCA,
  atualizarVNA,
} from "@/lib/finance/pu";
import {
  calcularYieldImplicito_CDI,
  calcularYieldImplicito_IPCA,
  calcularYieldImplicito_PreFixado,
} from "@/lib/finance/yield";
import {
  CURVA_ANBIMA_IPCA,
  CURVA_ANBIMA_PRE,
  CURVA_DI_B3,
  cdiProjetadoPara,
} from "@/lib/finance/curves";
import { spreadVsCurva } from "@/lib/finance/spread";
import { aliquotaIR, calcularYieldLiquido } from "@/lib/finance/taxation";
import { comparacaoVsCDI } from "@/lib/finance/cdi";
import { diasCorridos, diasUteis } from "@/lib/finance/holidays";
import { useFonteCurva } from "@/lib/curve-context";
import type { AssetType, Indexador, Perfil } from "@/types";

const ASSET_TYPES: AssetType[] = [
  "CDB",
  "LCI",
  "LCA",
  "Debênture",
  "CRI",
  "CRA",
  "Tesouro",
];

const INDEXADORES: { value: Indexador; label: string }[] = [
  { value: "PRE", label: "Pré-fixado" },
  { value: "CDI", label: "%CDI" },
  { value: "IPCA", label: "IPCA+" },
];

export function Simulator() {
  const { fonteCurva } = useFonteCurva();
  const [tipo, setTipo] = React.useState<AssetType>("CDB");
  const [perfil, setPerfil] = React.useState<Perfil>("PF");
  const [indexer, setIndexer] = React.useState<Indexador>("PRE");
  const [isIncentivada, setIsIncentivada] = React.useState(false);
  const [purchasePU, setPurchasePU] = React.useState(783.15);
  const [puSlider, setPuSlider] = React.useState([783.15]);
  const [faceValue, setFaceValue] = React.useState(1000);
  const [maturity, setMaturity] = React.useState("2028-05-11");
  const [taxaPre, setTaxaPre] = React.useState(0.16);
  const [percentCDI, setPercentCDI] = React.useState(115);
  const [cupomReal, setCupomReal] = React.useState(0.065);
  const [desiredReturn, setDesiredReturn] = React.useState(0.15);

  React.useEffect(() => {
    setPurchasePU(puSlider[0]);
  }, [puSlider]);

  // Reset incentivada when type is not Debênture
  React.useEffect(() => {
    if (tipo !== "Debênture") setIsIncentivada(false);
  }, [tipo]);

  const today = new Date("2026-05-11T00:00:00Z");
  const matDate = new Date(maturity);
  const du = Math.max(1, diasUteis(today, matDate));
  const dc = diasCorridos(today, matDate);

  // VNA atualizado se IPCA+ (assume emissão na data de hoje pra simplicidade)
  const vna = indexer === "IPCA" ? VNA_BASE : faceValue;

  // Yield bruto implícito a partir do PU + parâmetros
  let yieldBrutoAnual: number;
  let puJusto: number;
  let percentCDIImplicito: number | undefined;

  if (indexer === "PRE") {
    yieldBrutoAnual = calcularYieldImplicito_PreFixado(purchasePU, faceValue, du);
    puJusto = calcularPU_PreFixado(faceValue, taxaPre, du);
  } else if (indexer === "CDI") {
    const cdiProj = cdiProjetadoPara(du);
    const r = calcularYieldImplicito_CDI(purchasePU, faceValue, du, cdiProj);
    yieldBrutoAnual = r.taxaEquivAnual;
    percentCDIImplicito = r.percentCDI;
    puJusto = calcularPU_CDI(faceValue, percentCDI, du, cdiProj);
  } else {
    yieldBrutoAnual = calcularYieldImplicito_IPCA(purchasePU, vna, du);
    puJusto = calcularPU_IPCA(vna, cupomReal, du);
  }

  const yieldLiquidoAnual = calcularYieldLiquido(
    yieldBrutoAnual,
    tipo,
    dc,
    perfil,
    isIncentivada,
  );

  const ir = aliquotaIR({
    tipoAtivo: tipo,
    isIncentivada,
    prazoDias: dc,
    perfil,
  });

  const vsCDIBruto = comparacaoVsCDI(yieldBrutoAnual, cdiProjetadoPara(du));
  const vsCDILiquido = comparacaoVsCDI(yieldLiquidoAnual, cdiProjetadoPara(du));

  // Spread vs curva ativa
  let spreadBps: number;
  if (indexer === "IPCA") {
    spreadBps = spreadVsCurva(yieldBrutoAnual, du, CURVA_ANBIMA_IPCA, "IPCA");
  } else if (indexer === "PRE") {
    const curva = fonteCurva === "ANBIMA" ? CURVA_ANBIMA_PRE : CURVA_DI_B3;
    spreadBps = spreadVsCurva(yieldBrutoAnual, du, curva, "PRE");
  } else {
    spreadBps = (yieldBrutoAnual - cdiProjetadoPara(du)) * 10_000;
  }

  // Lucro estimado por unidade até o vencimento
  const valorResgate = indexer === "IPCA" ? vna : faceValue;
  const grossProfit = valorResgate - purchasePU;
  const netProfit = ir.isento ? grossProfit : grossProfit * (1 - ir.ir);

  // Break-even = PU que iguala CDI
  const breakEven =
    faceValue / Math.pow(1 + cdiProjetadoPara(du), du / 252);

  const meetsDesired = yieldLiquidoAnual >= desiredReturn;

  // Benchmarks chart data
  const ratesComparison = [
    { name: "Poupança", value: 0.062, color: "hsl(140 10% 50%)" },
    { name: "CDI", value: CDI_ANUAL, color: "hsl(199 89% 55%)" },
    { name: "Selic", value: SELIC_ANUAL, color: "hsl(160 70% 45%)" },
    {
      name: "Bruto",
      value: yieldBrutoAnual,
      color: "hsl(38 92% 55%)",
    },
    {
      name: "Líquido",
      value: yieldLiquidoAnual,
      color: "hsl(142 80% 48%)",
    },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-3.5 w-3.5" /> Parâmetros da Operação
            </CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Tipo de ativo, indexador, perfil tributário (PF/PJ), prazo e PU
              de compra alimentam o cálculo de yield bruto, líquido e spread.
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Profile + asset type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de Ativo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as AssetType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Perfil Tributário</Label>
                <Tabs value={perfil} onValueChange={(v) => setPerfil(v as Perfil)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="PF" className="flex-1">
                      Pessoa Física
                    </TabsTrigger>
                    <TabsTrigger value="PJ" className="flex-1">
                      Pessoa Jurídica
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {tipo === "Debênture" ? (
              <label className="inline-flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isIncentivada}
                  onChange={(e) => setIsIncentivada(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                Debênture incentivada (Lei 12.431) · isenta IR para PF
              </label>
            ) : null}

            {/* PU slider */}
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
                min={faceValue * 0.4}
                max={faceValue * 1.1}
                step={0.5}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>R$ {(faceValue * 0.4).toFixed(0)}</span>
                <span>R$ {(faceValue * 0.75).toFixed(0)}</span>
                <span>R$ {(faceValue * 1.1).toFixed(0)}</span>
              </div>
            </div>

            {/* Numeric inputs */}
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
                <Label>Indexador</Label>
                <Select value={indexer} onValueChange={(v) => setIndexer(v as Indexador)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INDEXADORES.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {indexer === "PRE" ? (
                <div className="space-y-1.5">
                  <Label>Taxa contratada (% a.a.)</Label>
                  <Input
                    type="number"
                    step={0.01}
                    value={(taxaPre * 100).toFixed(2)}
                    onChange={(e) => setTaxaPre((Number(e.target.value) || 0) / 100)}
                  />
                </div>
              ) : null}
              {indexer === "CDI" ? (
                <div className="space-y-1.5">
                  <Label>% CDI contratado</Label>
                  <Input
                    type="number"
                    step={0.1}
                    value={percentCDI}
                    onChange={(e) => setPercentCDI(Number(e.target.value) || 0)}
                  />
                </div>
              ) : null}
              {indexer === "IPCA" ? (
                <div className="space-y-1.5">
                  <Label>Cupom real (% a.a.)</Label>
                  <Input
                    type="number"
                    step={0.01}
                    value={(cupomReal * 100).toFixed(2)}
                    onChange={(e) =>
                      setCupomReal((Number(e.target.value) || 0) / 100)
                    }
                  />
                </div>
              ) : null}
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

            <div className="rounded-md border border-terminal-border bg-terminal-bg/40 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">PU justo (curva + parâmetros)</span>
                <span className="font-mono tabular-nums">R$ {puJusto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Δ vs PU de compra</span>
                <span
                  className={`font-mono tabular-nums ${
                    purchasePU < puJusto ? "text-positive" : "text-warning"
                  }`}
                >
                  {(((purchasePU - puJusto) / puJusto) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dias úteis · dias corridos</span>
                <span className="font-mono tabular-nums">{du}du · {dc}dc</span>
              </div>
              {indexer === "IPCA" ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VNA hoje (IPCA {formatPercent(IPCA_ANUAL)})</span>
                  <span className="font-mono tabular-nums">
                    R$ {atualizarVNA(VNA_BASE, IPCA_ANUAL, 0).toFixed(2)}
                  </span>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparação vs. Benchmarks</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Yield bruto e líquido confrontados com benchmarks de mercado
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={ratesComparison}
                margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="hsl(150 18% 14%)"
                  vertical={false}
                  strokeDasharray="2 4"
                />
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
            <CardTitle>Análise de Preço · Break-even</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Preço que iguala CDI no vértice + sensibilidade
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-terminal-border bg-terminal-bg/40 p-4 mb-3">
              <div className="text-xs text-muted-foreground mb-1">
                Preço de equilíbrio (yield bruto = CDI projetado)
              </div>
              <div className="text-2xl font-mono tabular-nums text-foreground">
                R$ {breakEven.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                CDI no vértice ({du}du) ≈ {formatPercent(cdiProjetadoPara(du))} ·
                comprar abaixo de break-even rende acima do CDI.
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              {[
                { label: "PU −2%", factor: 0.98 },
                { label: "PU atual", factor: 1.0, highlight: true },
                { label: "PU +2%", factor: 1.02 },
              ].map((s) => {
                const pu = purchasePU * s.factor;
                const y =
                  indexer === "PRE"
                    ? calcularYieldImplicito_PreFixado(pu, faceValue, du)
                    : indexer === "CDI"
                      ? calcularYieldImplicito_CDI(pu, faceValue, du, cdiProjetadoPara(du)).taxaEquivAnual
                      : calcularYieldImplicito_IPCA(pu, vna, du);
                const yl = calcularYieldLiquido(y, tipo, dc, perfil, isIncentivada);
                return (
                  <div
                    key={s.label}
                    className={`rounded-md border p-2 ${
                      s.highlight
                        ? "border-primary/40 bg-primary/[0.04]"
                        : "border-terminal-border bg-terminal-bg/40"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {s.label} · R$ {pu.toFixed(2)}
                    </div>
                    <div className="font-mono tabular-nums mt-1 flex items-baseline gap-1">
                      <span className="text-foreground">{formatPercent(y)}</span>
                      <span className="text-[10px] text-muted-foreground">bruto</span>
                    </div>
                    <div className="font-mono tabular-nums flex items-baseline gap-1">
                      <span className={s.highlight ? "text-primary" : "text-positive"}>
                        {formatPercent(yl)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">líq</span>
                    </div>
                  </div>
                );
              })}
            </div>
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
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-terminal-border bg-terminal-bg/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Yield Bruto a.a.
                </div>
                <div className="text-xl font-mono tabular-nums text-foreground font-semibold mt-1">
                  {formatPercent(yieldBrutoAnual)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {percentCDIImplicito != null
                    ? `${percentCDIImplicito.toFixed(1)}% CDI`
                    : indexer === "IPCA"
                      ? "juro real"
                      : "base 252du"}
                </div>
              </div>
              <div className="rounded-md border border-primary/30 bg-primary/[0.05] p-3">
                <div className="text-[10px] uppercase tracking-wider text-primary">
                  Yield Líquido a.a.
                </div>
                <div className="text-xl font-mono tabular-nums text-primary font-semibold mt-1">
                  {formatPercent(yieldLiquidoAnual)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {ir.descricao}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <span
                className={`font-mono px-2 py-1 rounded-sm ${
                  vsCDILiquido.percentCDI >= 100
                    ? "bg-positive/15 text-positive"
                    : "bg-warning/15 text-warning"
                }`}
              >
                {vsCDILiquido.percentCDI.toFixed(0)}% CDI líq
              </span>
              <span
                className={`font-mono px-2 py-1 rounded-sm ${
                  spreadBps >= 0
                    ? "bg-positive/15 text-positive"
                    : "bg-warning/15 text-warning"
                }`}
              >
                {spreadBps >= 0 ? "+" : ""}
                {spreadBps.toFixed(0)} bps
              </span>
              <span
                className={`font-mono px-2 py-1 rounded-sm ${
                  meetsDesired
                    ? "bg-positive/15 text-positive"
                    : "bg-destructive/15 text-destructive"
                }`}
              >
                {meetsDesired ? "✓ alvo" : "✗ alvo"}
              </span>
            </div>

            <Separator />

            <Row
              icon={<TrendingUp className="h-3.5 w-3.5 text-positive" />}
              label="Lucro bruto (1 unid.)"
              value={formatCurrency(grossProfit, 2)}
              positive
            />
            <Row
              icon={<Percent className="h-3.5 w-3.5 text-warning" />}
              label={ir.isento ? "Tributação" : `IR aplicável (${(ir.ir * 100).toFixed(1)}%)`}
              value={
                ir.isento
                  ? "Isento"
                  : formatCurrency(grossProfit * ir.ir, 2)
              }
              tone={ir.isento ? "positive" : "warning"}
            />
            <Row
              icon={<Equal className="h-3.5 w-3.5 text-primary" />}
              label="Lucro líquido (1 unid.)"
              value={formatCurrency(netProfit, 2)}
              highlight
            />
            <Separator />
            <Row label="Investimento" value={formatCurrency(purchasePU, 2)} />
            <Row
              label="Valor de resgate"
              value={formatCurrency(valorResgate, 2)}
              icon={<Scale className="h-3.5 w-3.5 text-muted-foreground" />}
            />
            <Row
              label="ROI líquido (no período)"
              value={`${((netProfit / purchasePU) * 100).toFixed(2)}%`}
              positive
            />
            <Row label="Dias úteis · corridos" value={`${du}du · ${dc}dc`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo Executivo</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-muted-foreground leading-relaxed">
            <p>
              Comprando 1 unidade por{" "}
              <span className="text-foreground font-mono">R$ {purchasePU.toFixed(2)}</span>{" "}
              de um{" "}
              <span className="text-foreground">
                {tipo}
                {isIncentivada ? " incentivado" : ""} {indexer === "PRE" ? "pré-fixado" : indexer === "CDI" ? "%CDI" : "IPCA+"}
              </span>{" "}
              com vencimento em {dc} dias, a taxa bruta implícita é{" "}
              <span className="text-foreground font-mono">{formatPercent(yieldBrutoAnual)}</span>{" "}
              {percentCDIImplicito != null ? (
                <>
                  (≈ <span className="text-foreground font-mono">{percentCDIImplicito.toFixed(1)}%</span> do CDI projetado)
                </>
              ) : null}.
            </p>
            <p>
              Para perfil <span className="text-foreground">{perfil}</span>,
              {ir.isento ? (
                <> a operação é <span className="text-positive">isenta</span> de IR (
                  {asset_type_isento_motivo(tipo, isIncentivada)})
                  e o yield líquido é igual ao bruto:{" "}
                  <span className="text-primary font-mono">{formatPercent(yieldLiquidoAnual)}</span>.
                </>
              ) : (
                <> aplica-se IR de{" "}
                  <span className="text-foreground font-mono">{(ir.ir * 100).toFixed(1)}%</span>
                  {" "}sobre os rendimentos, levando o yield líquido a{" "}
                  <span className="text-primary font-mono">{formatPercent(yieldLiquidoAnual)}</span>.
                </>
              )}
            </p>
            <p>
              Isso equivale a{" "}
              <span className="text-foreground font-mono">{vsCDILiquido.percentCDI.toFixed(1)}%</span>{" "}
              do CDI projetado (bruto:{" "}
              <span className="font-mono">{vsCDIBruto.percentCDI.toFixed(1)}%</span>)
              e a um spread de{" "}
              <span className={spreadBps >= 0 ? "text-positive font-mono" : "text-warning font-mono"}>
                {spreadBps >= 0 ? "+" : ""}{spreadBps.toFixed(0)} bps
              </span>{" "}
              sobre a curva {fonteCurva === "ANBIMA" ? "ANBIMA" : "DI · B3"} no vértice.
            </p>
            <p>
              Lucro líquido total estimado:{" "}
              <span className="text-positive font-mono">{formatCurrency(netProfit, 2)}</span> por unidade.
              Preço de equilíbrio (paridade CDI) ={" "}
              <span className="text-foreground font-mono">R$ {breakEven.toFixed(2)}</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function asset_type_isento_motivo(tipo: AssetType, isIncentivada: boolean): string {
  if (tipo === "Debênture" && isIncentivada) return "Lei 12.431 · debênture incentivada";
  if (tipo === "LCI" || tipo === "LCA") return `${tipo} · isento PF`;
  if (tipo === "CRI" || tipo === "CRA") return `${tipo} · isento PF`;
  return "isento";
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
  tone?: "warning" | "positive";
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
              : tone === "positive" || positive
                ? "text-positive"
                : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
