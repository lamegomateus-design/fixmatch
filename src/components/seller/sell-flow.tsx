"use client";

import * as React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
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
import { issuers } from "@/data/issuers";
import {
  computeAgioDeagio,
  computeDiscountPct,
  computeImpliedYield,
  daysBetween,
  formatCurrency,
  formatPercent,
} from "@/lib/finance";
import type { AssetType, IndexerType, Urgency } from "@/types";

const ASSET_TYPES: AssetType[] = [
  "CDB",
  "LCI",
  "LCA",
  "Debênture",
  "CRI",
  "CRA",
  "Tesouro",
];

const INDEXERS: IndexerType[] = ["Pré", "CDI", "IPCA+", "Selic"];

export function SellFlow() {
  const [type, setType] = React.useState<AssetType>("CDB");
  const [issuerId, setIssuerId] = React.useState(issuers[0].id);
  const [indexer, setIndexer] = React.useState<IndexerType>("Pré");
  const [maturity, setMaturity] = React.useState("2027-06-15");
  const [originalRate, setOriginalRate] = React.useState(0.135);
  const [currentPU, setCurrentPU] = React.useState(942.5);
  const [desiredPU, setDesiredPU] = React.useState(920);
  const [faceValue, setFaceValue] = React.useState(1000);
  const [quantity, setQuantity] = React.useState(150);
  const [urgency, setUrgency] = React.useState<Urgency>("Média");
  const [reason, setReason] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  const issuer = issuers.find((i) => i.id === issuerId) ?? issuers[0];
  const today = new Date("2026-05-11T00:00:00Z");
  const impliedYield = computeImpliedYield(desiredPU, faceValue, maturity, today);
  const agioDeagio = computeAgioDeagio(currentPU, desiredPU);
  const discount = computeDiscountPct(faceValue, desiredPU);
  const dtm = daysBetween(today, maturity);
  const volume = desiredPU * quantity;

  // Suggested fair price range = +/-1.5% around currentPU adjusted by urgency
  const urgencyFactor = urgency === "Alta" ? 0.025 : urgency === "Média" ? 0.015 : 0.008;
  const fairLow = currentPU * (1 - urgencyFactor);
  const fairHigh = currentPU * (1 - urgencyFactor / 3);

  // Match probability
  const inRange = desiredPU >= fairLow && desiredPU <= fairHigh;
  const overshoot =
    desiredPU < fairLow
      ? Math.max(0, (fairLow - desiredPU) / currentPU)
      : Math.max(0, (desiredPU - fairHigh) / currentPU);
  let matchProb = inRange ? 90 : Math.max(10, 80 - overshoot * 4000);
  if (urgency === "Alta") matchProb = Math.min(98, matchProb + 5);
  matchProb = Math.round(matchProb);

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
              <span className="font-mono">{type} · {issuer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volume ofertado</span>
              <span className="font-mono">{formatCurrency(volume, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa implícita</span>
              <span className="font-mono text-primary">{formatPercent(impliedYield)}</span>
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
            Preencha os dados do título e a oferta de venda. O motor irá calcular
            taxa implícita, deságio e probabilidade de match.
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Section title="1. Identificação do Ativo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Tipo de Ativo">
                <Select value={type} onValueChange={(v) => setType(v as AssetType)}>
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
              </Field>
              <Field label="Emissor">
                <Select value={issuerId} onValueChange={setIssuerId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {issuers.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name} · {i.rating}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Indexador">
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
              </Field>
              <Field label="Vencimento">
                <Input
                  type="date"
                  value={maturity}
                  onChange={(e) => setMaturity(e.target.value)}
                />
              </Field>
              <Field label="Taxa Original (% a.a.)">
                <Input
                  type="number"
                  step={0.01}
                  value={(originalRate * 100).toFixed(2)}
                  onChange={(e) =>
                    setOriginalRate((Number(e.target.value) || 0) / 100)
                  }
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
            </div>
          </Section>

          <Section title="2. Preço & Volume">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="PU Atual (mark)">
                <Input
                  type="number"
                  step={0.01}
                  value={currentPU}
                  onChange={(e) => setCurrentPU(Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="PU de Venda Desejado">
                <Input
                  type="number"
                  step={0.01}
                  value={desiredPU}
                  onChange={(e) => setDesiredPU(Number(e.target.value) || 0)}
                  className="border-primary/40"
                />
              </Field>
              <Field label="Quantidade">
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                />
              </Field>
            </div>
            <div className="rounded-md border border-terminal-border bg-terminal-bg/40 p-3 mt-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  Volume estimado da oferta
                </span>
                <span className="font-mono tabular-nums text-base text-primary font-semibold">
                  {formatCurrency(volume, 2)}
                </span>
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
              Atualiza em tempo real conforme você ajusta a oferta
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Stat label="Taxa Implícita ao Comprador" value={formatPercent(impliedYield)} highlight />
            <Stat label="Deságio sobre face value" value={`${(discount * 100).toFixed(2)}%`} />
            <Stat
              label="Ágio / Deságio vs. PU atual"
              value={`${(agioDeagio * 100).toFixed(2)}%`}
              tone={agioDeagio < 0 ? "positive" : "warning"}
            />
            <Stat
              label="Pickup vs. taxa original"
              value={`${((impliedYield - originalRate) * 10000).toFixed(0)} bps`}
              tone={impliedYield > originalRate ? "positive" : "warning"}
            />
            <Stat label="Dias até vencimento" value={`${dtm}d`} />
            <Separator />
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Faixa sugerida (PU)</span>
                <span className="font-mono tabular-nums">
                  R$ {fairLow.toFixed(2)} – R$ {fairHigh.toFixed(2)}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                Calculada com base em urgência ({urgency}) e PU atual de mercado.
              </div>
            </div>
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
              <div className="text-[10px] text-muted-foreground font-mono mt-1.5">
                {inRange
                  ? "Oferta dentro da faixa atrativa de mercado."
                  : desiredPU < fairLow
                    ? "Preço agressivo · venderá rápido mas com deságio elevado."
                    : "Preço acima da faixa · pode ficar parado no livro."}
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
            <Stat label="Ativo" value={`${type} · ${issuer.name}`} small />
            <Stat label="Rating" value={issuer.rating} small mono />
            <Stat label="Vencimento" value={maturity} small mono />
            <Stat label="PU desejado" value={`R$ ${desiredPU.toFixed(2)}`} small mono />
            <Stat label="Quantidade" value={quantity.toLocaleString("pt-BR")} small mono />
            <Stat
              label="Volume total"
              value={formatCurrency(volume, 2)}
              small
              mono
              highlight
            />
            <div className="pt-2">
              <Badge variant={urgency === "Alta" ? "destructive" : urgency === "Média" ? "warning" : "muted"}>
                Urgência {urgency}
              </Badge>
            </div>
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
