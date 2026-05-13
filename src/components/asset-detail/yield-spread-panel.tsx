"use client";

import * as React from "react";
import { ArrowRight, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatPercent } from "@/lib/finance";
import {
  aliquotaIR,
  calcularYieldLiquido,
} from "@/lib/finance/taxation";
import { spreadVsCurva } from "@/lib/finance/spread";
import {
  CURVA_ANBIMA_IPCA,
  CURVA_ANBIMA_PRE,
  CURVA_DI_B3,
  cdiProjetadoPara,
} from "@/lib/finance/curves";
import { comparacaoVsCDI } from "@/lib/finance/cdi";
import { diasUteis, diasCorridos } from "@/lib/finance/holidays";
import { useFonteCurva } from "@/lib/curve-context";
import type { Indexador, Offer, Perfil } from "@/types";

interface Props {
  offer: Offer;
}

/**
 * Painel client-side de análise de yield e spread. Responsivo ao
 * toggle DI/ANBIMA do topbar e ao perfil PF/PJ escolhido aqui.
 *
 * Substitui o cálculo hardcoded de IR=15% pelo `calcularYieldLiquido`
 * que aplica a tabela regressiva + isenções de PF (LCI/LCA/CRI/CRA/
 * Debênture incentivada Lei 12.431).
 */
export function YieldSpreadPanel({ offer }: Props) {
  const { fonteCurva } = useFonteCurva();
  const [perfil, setPerfil] = React.useState<Perfil>("PF");

  const asset = offer.asset;
  const indexer: Indexador =
    asset.indexerCode ??
    (asset.indexer === "Pré"
      ? "PRE"
      : asset.indexer === "IPCA+"
        ? "IPCA"
        : "CDI");

  const today = new Date("2026-05-11T00:00:00Z");
  const du = Math.max(1, diasUteis(today, asset.maturity));
  const dc = diasCorridos(today, asset.maturity);

  const yieldBruto = offer.yieldBrutoAnual ?? offer.offeredRate;
  const yieldLiquido = calcularYieldLiquido(
    yieldBruto,
    asset.type,
    dc,
    perfil,
    asset.isIncentivada ?? false,
  );

  // Spread responsivo ao toggle de curva
  let spreadBps: number;
  if (indexer === "IPCA") {
    spreadBps = spreadVsCurva(yieldBruto, du, CURVA_ANBIMA_IPCA, "IPCA");
  } else if (indexer === "PRE") {
    const curva = fonteCurva === "ANBIMA" ? CURVA_ANBIMA_PRE : CURVA_DI_B3;
    spreadBps = spreadVsCurva(yieldBruto, du, curva, "PRE");
  } else {
    spreadBps = (yieldBruto - cdiProjetadoPara(du)) * 10_000;
  }

  const ir = aliquotaIR({
    tipoAtivo: asset.type,
    isIncentivada: asset.isIncentivada,
    prazoDias: dc,
    perfil,
  });

  const vsCDI = comparacaoVsCDI(yieldLiquido, cdiProjetadoPara(du));

  // Lucro estimado por unidade até o vencimento
  const valorResgate = indexer === "IPCA" ? (asset.vna ?? asset.faceValue) : asset.faceValue;
  const grossProfit = valorResgate - offer.offeredPU;
  const netProfit = ir.isento ? grossProfit : grossProfit * (1 - ir.ir);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Análise de Yield e Spread</CardTitle>
          <div className="text-xs text-muted-foreground mt-1">
            Yield bruto vs líquido · spread contra curva ativa · tributação aplicada
          </div>
        </div>
        <Tabs value={perfil} onValueChange={(v) => setPerfil(v as Perfil)}>
          <TabsList className="h-8">
            <TabsTrigger value="PF" className="text-[11px]">Perfil PF</TabsTrigger>
            <TabsTrigger value="PJ" className="text-[11px]">Perfil PJ</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Yield bruto vs líquido lado a lado */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-terminal-border bg-terminal-bg/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Yield bruto a.a.
            </div>
            <div className="text-2xl font-mono tabular-nums text-foreground font-semibold mt-1">
              {formatPercent(yieldBruto)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {indexer === "IPCA"
                ? "juro real (sobre IPCA)"
                : indexer === "CDI"
                  ? `equiv. ${((yieldBruto / cdiProjetadoPara(du)) * 100).toFixed(1)}% CDI`
                  : "pré-fixado · base 252du"}
            </div>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/[0.05] p-3">
            <div className="text-[10px] uppercase tracking-wider text-primary">
              Yield líquido a.a. · {perfil}
            </div>
            <div className="text-2xl font-mono tabular-nums text-primary font-semibold mt-1">
              {formatPercent(yieldLiquido)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {ir.descricao}
            </div>
          </div>
        </div>

        {/* Spread e %CDI */}
        <div className="grid grid-cols-3 gap-3">
          <StatBlock
            label={`Spread vs curva ${fonteCurva === "ANBIMA" ? "ANBIMA" : "DI · B3"}`}
            value={`${spreadBps >= 0 ? "+" : ""}${spreadBps.toFixed(0)} bps`}
            tone={spreadBps >= 0 ? "positive" : "warning"}
          />
          <StatBlock
            label="%CDI líquido"
            value={`${vsCDI.percentCDI.toFixed(1)}%`}
            tone={vsCDI.percentCDI >= 100 ? "positive" : "warning"}
          />
          <StatBlock
            label="Ágio / Deságio (justo)"
            value={`${(offer.agioDeagioBps ?? 0) >= 0 ? "+" : ""}${(offer.agioDeagioBps ?? 0).toFixed(0)} bps`}
            tone={(offer.agioDeagioBps ?? 0) >= 0 ? "positive" : "warning"}
          />
        </div>

        <Separator />

        {/* Decomposição de retorno */}
        <div className="space-y-2 text-sm">
          <Row
            label="Investimento por unidade"
            value={`R$ ${offer.offeredPU.toFixed(2)}`}
          />
          <Row
            label={
              indexer === "IPCA"
                ? "Valor de resgate estimado (VNA atual)"
                : "Valor de resgate (face)"
            }
            value={`R$ ${valorResgate.toFixed(2)}`}
          />
          <Row
            label="Lucro bruto até venc. (1 unid.)"
            value={`R$ ${grossProfit.toFixed(2)}`}
            tone="positive"
          />
          {ir.isento ? (
            <Row label="IR aplicável" value="Isento" tone="positive" />
          ) : (
            <Row
              label={`IR aplicável (${(ir.ir * 100).toFixed(1)}%)`}
              value={`R$ ${(grossProfit * ir.ir).toFixed(2)}`}
              tone="warning"
            />
          )}
          <Row
            label="Lucro líquido (1 unid.)"
            value={`R$ ${netProfit.toFixed(2)}`}
            highlight
          />
          <Row
            label={`Lucro líquido total · ${offer.quantity.toLocaleString("pt-BR")} unid.`}
            value={formatCurrency(netProfit * offer.quantity, 2)}
            highlight
          />
        </div>

        {/* Nota explicativa */}
        <div className="flex gap-2 rounded-md border border-info/20 bg-info/[0.05] p-2.5 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            Cálculo de IR usa tabela regressiva (Lei 11.033) para CDB / Tesouro /
            Debênture comum. {asset.isIncentivada ? "Esta debênture é Lei 12.431 (incentivada · isenta PF). " : ""}
            LCI / LCA / CRI / CRA são isentos para PF.{" "}
            <span className="text-foreground">PJ é sempre tributado.</span>
            {perfil === "PF" ? (
              <span className="inline-flex items-center gap-0.5 ml-1">
                <ArrowRight className="h-2.5 w-2.5" /> trocar para PJ recalcula.
              </span>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "warning";
}) {
  return (
    <div className="rounded-md border border-terminal-border bg-terminal-bg/40 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`font-mono tabular-nums text-base mt-1 ${
          tone === "positive"
            ? "text-positive"
            : tone === "warning"
              ? "text-warning"
              : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
  highlight,
}: {
  label: string;
  value: string;
  tone?: "positive" | "warning";
  highlight?: boolean;
}) {
  const cls = highlight
    ? "text-primary font-semibold"
    : tone === "positive"
      ? "text-positive"
      : tone === "warning"
        ? "text-warning"
        : "";
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={`font-mono tabular-nums ${cls}`}>{value}</span>
    </div>
  );
}
