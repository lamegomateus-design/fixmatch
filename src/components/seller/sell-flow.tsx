"use client";

import * as React from "react";
import { CheckCircle2, Info, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { issuersWithMeta, type IssuerTag } from "@/data/issuers";
import { medianSpreadByIndexerBps } from "@/data/aggregates";
import { formatCurrency, formatPercent } from "@/lib/finance";
import { CDI_ANUAL, IPCA_ANUAL, VNA_BASE } from "@/lib/finance/constants";
import {
  calcularPU_CDI,
  calcularPU_IPCA,
  calcularPU_PreFixado,
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
  interpolarCurva,
} from "@/lib/finance/curves";
import { diasCorridos, diasUteis } from "@/lib/finance/holidays";
import { useFonteCurva } from "@/lib/curve-context";
import type {
  AssetType,
  Indexador,
  RatingTier,
  Urgency,
} from "@/types";

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

/** Spread de crédito por rating (mediana da faixa) — usado pra calcular puJusto. */
const SPREAD_BPS_MID: Record<RatingTier, number> = {
  AAA: 50,
  "AA+": 90,
  AA: 135,
  "AA-": 185,
  "A+": 245,
  A: 320,
  "A-": 405,
  "BBB+": 525,
  BBB: 675,
  "BBB-": 825,
  BB: 1000,
  B: 1250,
};

/** Filtra emissores compatíveis com o tipo de ativo escolhido. */
function emissoresValidosPara(tipo: AssetType, isIncentivada: boolean) {
  let tags: IssuerTag[];
  switch (tipo) {
    case "CDB":
    case "LCI":
    case "LCA":
      tags = ["bank"];
      break;
    case "Debênture":
      tags = isIncentivada ? ["corporate_incentivada"] : ["corporate", "corporate_incentivada"];
      break;
    case "CRI":
    case "CRA":
      tags = ["securitizadora"];
      break;
    case "Tesouro":
      tags = ["governo"];
      break;
  }
  return issuersWithMeta.filter((i) => tags.includes(i.tag));
}

export function SellFlow() {
  const { fonteCurva } = useFonteCurva();

  const [tipo, setTipo] = React.useState<AssetType>("CDB");
  const [isIncentivada, setIsIncentivada] = React.useState(false);
  const [indexer, setIndexer] = React.useState<Indexador>("PRE");
  const [maturity, setMaturity] = React.useState("2028-06-15");
  const [faceValue, setFaceValue] = React.useState(1000);
  const [taxaPre, setTaxaPre] = React.useState(0.155);
  const [percentCDI, setPercentCDI] = React.useState(115);
  const [cupomReal, setCupomReal] = React.useState(0.065);
  const [issueDate, setIssueDate] = React.useState("2024-06-15");
  const [quantity, setQuantity] = React.useState(150);
  const [urgency, setUrgency] = React.useState<Urgency>("Média");
  const [reason, setReason] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  // Emissor é guiado pelo tipo
  const emissores = React.useMemo(
    () => emissoresValidosPara(tipo, isIncentivada),
    [tipo, isIncentivada],
  );
  const [issuerId, setIssuerId] = React.useState(emissores[0]?.id ?? "");
  React.useEffect(() => {
    if (!emissores.find((e) => e.id === issuerId)) {
      setIssuerId(emissores[0]?.id ?? "");
    }
  }, [emissores, issuerId]);
  const issuer = emissores.find((e) => e.id === issuerId) ?? emissores[0];

  // Reset incentivada se não for Debênture
  React.useEffect(() => {
    if (tipo !== "Debênture") setIsIncentivada(false);
  }, [tipo]);

  // Indexador permitido pelo tipo (LCI/LCA não fazem IPCA, etc.)
  const indexadoresPermitidos: Indexador[] = React.useMemo(() => {
    if (isIncentivada) return ["IPCA"];
    if (tipo === "LCI" || tipo === "LCA") return ["PRE", "CDI"];
    if (tipo === "CRI" || tipo === "CRA") return ["IPCA", "PRE"];
    if (tipo === "CDB") return ["PRE", "CDI"];
    return ["PRE", "CDI", "IPCA"];
  }, [tipo, isIncentivada]);
  React.useEffect(() => {
    if (!indexadoresPermitidos.includes(indexer)) {
      setIndexer(indexadoresPermitidos[0]);
    }
  }, [indexadoresPermitidos, indexer]);

  const today = new Date("2026-05-11T00:00:00Z");
  const matDate = new Date(maturity);
  const issDate = new Date(issueDate);
  const du = Math.max(1, diasUteis(today, matDate));
  const dc = diasCorridos(today, matDate);

  // ── Engine: calcula puJusto, yield justo, faixa ───────────────────
  const rating = issuer?.rating ?? "A";
  const taxaCurva =
    indexer === "IPCA"
      ? interpolarCurva(CURVA_ANBIMA_IPCA, du)
      : indexer === "PRE"
        ? interpolarCurva(
            fonteCurva === "ANBIMA" ? CURVA_ANBIMA_PRE : CURVA_DI_B3,
            du,
          )
        : cdiProjetadoPara(du);

  const spreadCreditoBps =
    indexer === "IPCA" ? SPREAD_BPS_MID[rating] / 2 : SPREAD_BPS_MID[rating];
  const yieldJustoAnual = taxaCurva + spreadCreditoBps / 10_000;

  // VNA hoje (apenas IPCA)
  const dcDesdeEmissao = diasCorridos(issDate, today);
  const vna = atualizarVNA(VNA_BASE, IPCA_ANUAL, dcDesdeEmissao);

  // PU justo
  let puJusto: number;
  if (indexer === "PRE") {
    puJusto = calcularPU_PreFixado(faceValue, yieldJustoAnual, du);
  } else if (indexer === "CDI") {
    puJusto = calcularPU_CDI(faceValue, percentCDI, du, cdiProjetadoPara(du));
  } else {
    puJusto = calcularPU_IPCA(vna, cupomReal, du);
  }

  // Faixa sugerida = puJusto ± 2%
  const faixaLow = puJusto * 0.98;
  const faixaHigh = puJusto * 1.02;

  // Default do PU de venda = ponto médio (e seguimos atualizando via input)
  const [desiredPU, setDesiredPU] = React.useState<number>(puJusto * 0.985);
  React.useEffect(() => {
    // sempre que premissas mudam, re-centro o desiredPU na faixa
    setDesiredPU(Math.round(puJusto * 0.985 * 100) / 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tipo, isIncentivada, indexer, maturity, faceValue, taxaPre,
    percentCDI, cupomReal, issuerId, issueDate, fonteCurva,
  ]);

  // Yield implícito e spread no preço desejado
  let yieldImplicito: number;
  let percentCDIImplicito: number | undefined;
  if (indexer === "PRE") {
    yieldImplicito = calcularYieldImplicito_PreFixado(desiredPU, faceValue, du);
  } else if (indexer === "CDI") {
    const r = calcularYieldImplicito_CDI(
      desiredPU, faceValue, du, cdiProjetadoPara(du),
    );
    yieldImplicito = r.taxaEquivAnual;
    percentCDIImplicito = r.percentCDI;
  } else {
    yieldImplicito = calcularYieldImplicito_IPCA(desiredPU, vna, du);
  }

  const spreadImplicitoBps = (yieldImplicito - taxaCurva) * 10_000;
  const deltaJustoBps = (yieldImplicito - yieldJustoAnual) * 10_000;

  // Volume
  const volume = desiredPU * quantity;

  // ── Probabilidade de match ───────────────────────────────────────
  // Compara o spread implícito com a mediana do spread das ofertas
  // ativas do mesmo indexador no livro (pré-computada em offers.ts).
  // Quanto mais spread, mais atrativa pro comprador, maior a chance.
  const matchProb = React.useMemo(() => {
    const median = medianSpreadByIndexerBps[indexer] ?? 0;

    // Probabilidade base 50%, ajustada pela diferença em bps:
    //   +50bps acima da mediana → +30 pp
    //   −50bps abaixo da mediana → −30 pp
    let p = 50 + ((spreadImplicitoBps - median) / 50) * 30;

    // Bônus por urgência (até +12 pp)
    p += urgency === "Alta" ? 12 : urgency === "Média" ? 5 : 0;

    return Math.max(5, Math.min(98, Math.round(p)));
  }, [indexer, spreadImplicitoBps, urgency]);

  // Mensagem da faixa
  const dentroDaFaixa = desiredPU >= faixaLow && desiredPU <= faixaHigh;

  if (submitted) {
    return (
      <Card className="border-primary/40 bg-primary/[0.04]">
        <CardContent className="p-8 text-center max-w-xl mx-auto">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Oferta enviada ao livro</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Sua oferta foi recebida e entrará em análise da mesa FIXMATCH. O motor
            de matching irá conectar sua oferta a compradores compatíveis em até 24h.
          </p>
          <div className="flex flex-col gap-2 max-w-sm mx-auto rounded-md border border-terminal-border bg-terminal-bg/40 p-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ativo</span>
              <span className="font-mono">{tipo} {INDEXADORES.find(i=>i.value===indexer)?.label} · {issuer?.name ?? ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PU de venda</span>
              <span className="font-mono">R$ {desiredPU.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volume ofertado</span>
              <span className="font-mono">{formatCurrency(volume, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Yield implícito</span>
              <span className="font-mono text-primary">
                {percentCDIImplicito != null
                  ? `${percentCDIImplicito.toFixed(1)}% CDI`
                  : formatPercent(yieldImplicito)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Spread vs curva</span>
              <span className="font-mono">
                {spreadImplicitoBps >= 0 ? "+" : ""}{spreadImplicitoBps.toFixed(0)} bps
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Probabilidade de match</span>
              <span className="font-mono text-primary">{matchProb}%</span>
            </div>
          </div>
          <Button className="mt-6" onClick={() => setSubmitted(false)}>
            Listar outro ativo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Listar Ativo para Venda</CardTitle>
          <div className="text-xs text-muted-foreground mt-1">
            Preencha os dados do título e a oferta de venda. O motor FIXMATCH
            calcula PU justo (curva + spread por rating), faixa sugerida e
            probabilidade de match contra o livro atual.
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Section title="1. Identificação do Ativo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Tipo de Ativo">
                <Select value={tipo} onValueChange={(v) => setTipo(v as AssetType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Emissor">
                <Select value={issuerId} onValueChange={setIssuerId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {emissores.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name} · {i.rating}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {tipo === "Debênture" ? (
                <label className="md:col-span-2 inline-flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isIncentivada}
                    onChange={(e) => setIsIncentivada(e.target.checked)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  Debênture incentivada (Lei 12.431 · isenta IR para PF · sempre IPCA+)
                </label>
              ) : null}
              <Field label="Indexador">
                <Select value={indexer} onValueChange={(v) => setIndexer(v as Indexador)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {indexadoresPermitidos.map((v) => (
                      <SelectItem key={v} value={v}>
                        {INDEXADORES.find((x) => x.value === v)?.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Data de Emissão">
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </Field>
              <Field label="Vencimento">
                <Input
                  type="date"
                  value={maturity}
                  onChange={(e) => setMaturity(e.target.value)}
                />
              </Field>
              <Field label="Valor de Face (R$)">
                <Input
                  type="number"
                  step={0.01}
                  value={faceValue}
                  onChange={(e) => setFaceValue(Number(e.target.value) || 0)}
                />
              </Field>
              {indexer === "PRE" ? (
                <Field label="Taxa Pré contratada (% a.a.)">
                  <Input
                    type="number"
                    step={0.01}
                    value={(taxaPre * 100).toFixed(2)}
                    onChange={(e) =>
                      setTaxaPre((Number(e.target.value) || 0) / 100)
                    }
                  />
                </Field>
              ) : null}
              {indexer === "CDI" ? (
                <Field label="% CDI contratado">
                  <Input
                    type="number"
                    step={0.1}
                    value={percentCDI}
                    onChange={(e) => setPercentCDI(Number(e.target.value) || 0)}
                  />
                </Field>
              ) : null}
              {indexer === "IPCA" ? (
                <Field label="Cupom real (% a.a.)">
                  <Input
                    type="number"
                    step={0.01}
                    value={(cupomReal * 100).toFixed(2)}
                    onChange={(e) =>
                      setCupomReal((Number(e.target.value) || 0) / 100)
                    }
                  />
                </Field>
              ) : null}
            </div>
          </Section>

          <Section title="2. Preço & Volume">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="PU de Venda Desejado">
                <Input
                  type="number"
                  step={0.01}
                  value={desiredPU.toFixed(2)}
                  onChange={(e) => setDesiredPU(Number(e.target.value) || 0)}
                  className="border-primary/40"
                />
              </Field>
              <Field label="PU Justo (referência)">
                <div className="h-9 inline-flex items-center px-3 rounded-md border border-terminal-border bg-terminal-bg/40 font-mono text-sm tabular-nums">
                  R$ {puJusto.toFixed(2)}
                </div>
              </Field>
              <Field label="Quantidade">
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div className="rounded-md border border-terminal-border bg-terminal-bg/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Faixa sugerida (puJusto ± 2%)
                </div>
                <div className="font-mono tabular-nums text-sm mt-1">
                  R$ {faixaLow.toFixed(2)} – R$ {faixaHigh.toFixed(2)}
                </div>
                <div className={`text-[11px] mt-1 ${dentroDaFaixa ? "text-positive" : "text-warning"}`}>
                  {dentroDaFaixa
                    ? "✓ dentro da faixa de mercado"
                    : desiredPU < faixaLow
                      ? "↓ abaixo da faixa · vende rápido com deságio"
                      : "↑ acima da faixa · pode demorar no livro"}
                </div>
              </div>
              <div className="rounded-md border border-terminal-border bg-terminal-bg/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Volume da oferta
                </div>
                <div className="font-mono tabular-nums text-lg text-primary font-semibold mt-1">
                  {formatCurrency(volume, 2)}
                </div>
              </div>
            </div>
          </Section>

          <Section title="3. Motivação & Urgência">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Urgência da Venda">
                <Select value={urgency} onValueChange={(v) => setUrgency(v as Urgency)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa · sem pressa</SelectItem>
                    <SelectItem value="Média">Média · até 7 dias</SelectItem>
                    <SelectItem value="Alta">Alta · liquidez imediata</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Motivo da Venda (opcional)">
                <Input
                  placeholder="Realocação, capital de giro, marcação..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
            </div>
            <Textarea
              placeholder="Notas adicionais para a contraparte (custódia, condições específicas...)"
              rows={3}
              className="mt-3"
            />
          </Section>

          <Button size="lg" className="w-full" onClick={() => setSubmitted(true)}>
            Enviar Oferta ao Livro
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.05] to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Pré-análise FIXMATCH
            </CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Atualiza em tempo real conforme você ajusta a oferta · curva{" "}
              {fonteCurva === "ANBIMA" ? "ANBIMA" : "DI · B3"}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Stat
              label={indexer === "CDI" ? "% CDI implícito" : "Yield implícito (bruto)"}
              value={
                indexer === "CDI" && percentCDIImplicito != null
                  ? `${percentCDIImplicito.toFixed(1)}% CDI`
                  : formatPercent(yieldImplicito)
              }
              highlight
            />
            <Stat label="Yield justo (curva + spread)" value={formatPercent(yieldJustoAnual)} />
            <Stat
              label="Δ vs justo"
              value={`${deltaJustoBps >= 0 ? "+" : ""}${deltaJustoBps.toFixed(0)} bps`}
              tone={deltaJustoBps >= 0 ? "positive" : "warning"}
            />
            <Stat
              label="Spread vs curva"
              value={`${spreadImplicitoBps >= 0 ? "+" : ""}${spreadImplicitoBps.toFixed(0)} bps`}
              tone={spreadImplicitoBps >= 0 ? "positive" : "warning"}
            />
            <Stat label="Spread de crédito modelo" value={`${spreadCreditoBps.toFixed(0)} bps`} />
            <Stat label="Curva no vértice" value={formatPercent(taxaCurva)} />
            <Stat label="Dias úteis / corridos" value={`${du}du · ${dc}dc`} />
            {indexer === "IPCA" ? (
              <Stat label="VNA hoje" value={`R$ ${vna.toFixed(2)}`} mono />
            ) : null}
            <Separator />
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-muted-foreground">
                  Probabilidade de Match
                </span>
                <span className="font-mono text-primary text-base font-semibold">
                  {matchProb}%
                </span>
              </div>
              <Progress value={matchProb} />
              <div className="text-[10px] text-muted-foreground font-mono mt-1.5 inline-flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <span>
                  Compara o spread implícito desta oferta contra a mediana das
                  ofertas {INDEXADORES.find((i) => i.value === indexer)?.label} ativas
                  no livro · urgência {urgency} adiciona bônus.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2.5 text-muted-foreground">
            <Step n={1} text="Submeter oferta ao livro com os dados acima." />
            <Step n={2} text="Mesa FIXMATCH valida custódia e compliance (até 24h)." />
            <Step n={3} text="Oferta publicada · compradores manifestam intenção." />
            <Step n={4} text="Match e contraproposta entre vendedor e comprador." />
            <Step n={5} text="Liquidação em D+1 via custódia e Cetip/B3." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Stat label="Ativo" value={`${tipo} · ${issuer?.name ?? "—"}`} small />
            <Stat label="Rating" value={issuer?.rating ?? "—"} small mono />
            <Stat label="Indexador" value={INDEXADORES.find((i) => i.value === indexer)?.label ?? "—"} small />
            <Stat label="Vencimento" value={maturity} small mono />
            <Stat label="PU desejado" value={`R$ ${desiredPU.toFixed(2)}`} small mono />
            <Stat label="Quantidade" value={quantity.toLocaleString("pt-BR")} small mono />
            <Stat label="Volume total" value={formatCurrency(volume, 2)} small mono highlight />
            <div className="pt-2">
              <Badge variant={urgency === "Alta" ? "destructive" : urgency === "Média" ? "warning" : "muted"}>
                Urgência {urgency}
              </Badge>
              {isIncentivada ? (
                <Badge variant="positive" className="ml-1">Lei 12.431</Badge>
              ) : null}
            </div>
            <Stat label="CDI atual" value={formatPercent(CDI_ANUAL)} small mono />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-[0.18em] font-semibold text-muted-foreground border-l-2 border-primary pl-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  highlight,
  small,
  mono = true,
}: {
  label: string;
  value: string;
  tone?: "positive" | "warning";
  highlight?: boolean;
  small?: boolean;
  mono?: boolean;
}) {
  const cls =
    tone === "positive"
      ? "text-positive"
      : tone === "warning"
        ? "text-warning"
        : highlight
          ? "text-primary font-semibold"
          : "";
  return (
    <div className={`flex justify-between items-baseline ${small ? "text-xs" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={`${mono ? "font-mono tabular-nums" : ""} ${cls}`}>
        {value}
      </span>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="grid place-items-center h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] font-mono font-semibold shrink-0">
        {n}
      </span>
      <span className="text-foreground/80">{text}</span>
    </div>
  );
}
