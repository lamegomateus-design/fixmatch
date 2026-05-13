import { notFound } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Coins,
  Gauge,
  Layers,
  Percent,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetTypeChip } from "@/components/shared/asset-type-chip";
import { RatingPill } from "@/components/shared/rating-pill";
import { StatusBadge } from "@/components/shared/status-badge";
import { UrgencyIndicator } from "@/components/shared/urgency-indicator";
import { MatchScore } from "@/components/shared/match-score";
import { PUComparison } from "@/components/asset-detail/pu-comparison";
import { RateTunnelChart } from "@/components/asset-detail/rate-tunnel-chart";
import { ExecutedRatesChart } from "@/components/asset-detail/executed-rates-chart";
import { BuyIntentForm } from "@/components/asset-detail/buy-intent-form";
import { YieldSpreadPanel } from "@/components/asset-detail/yield-spread-panel";
import { offers } from "@/data/offers";
import {
  buildExecutedRateSeries,
  buildHistoricalRateTunnel,
} from "@/data/trades";
import {
  CDI_ANUAL,
  diasCorridos,
  formatCurrency,
  formatDateBR,
  formatPercent,
} from "@/lib/finance";
import { cdiProjetadoPara } from "@/lib/finance/curves";
import { diasUteis } from "@/lib/finance/holidays";
import type { Indexador } from "@/types";

export function generateStaticParams() {
  return offers.map((o) => ({ id: o.id }));
}

export default function OfferDetailPage({ params }: { params: { id: string } }) {
  const offer = offers.find((o) => o.id === params.id);
  if (!offer) return notFound();

  const asset = offer.asset;
  const today = new Date("2026-05-11T00:00:00Z");
  const dtm = diasCorridos(today, asset.maturity);
  const du = Math.max(1, diasUteis(today, asset.maturity));
  const indexer: Indexador =
    asset.indexerCode ??
    (asset.indexer === "Pré"
      ? "PRE"
      : asset.indexer === "IPCA+"
        ? "IPCA"
        : "CDI");

  const yieldBruto = offer.yieldBrutoAnual ?? offer.offeredRate;
  const cdiNoVertice = cdiProjetadoPara(du);

  const tunnelData = buildHistoricalRateTunnel(yieldBruto, 90);
  const executedData = buildExecutedRateSeries(yieldBruto, 18);

  return (
    <div className="space-y-6 max-w-[1480px] mx-auto">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/offer-book" className="hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Livro de Ofertas
        </Link>
        <span>/</span>
        <span className="text-foreground">{asset.ticker}</span>
      </div>

      <PageHeader
        tag={`Oferta · ${offer.id.toUpperCase()}`}
        title={`${asset.ticker} · ${asset.issuer.name}`}
        subtitle={`${asset.type} ${asset.indexer} · Vencimento ${formatDateBR(asset.maturity)} · ${asset.couponFreq ?? ""}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/simulator">Abrir no Simulador</Link>
            </Button>
            <Button asChild>
              <a href="#intent">Manifestar Compra</a>
            </Button>
          </>
        }
      />

      {/* Hero metrics */}
      <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <HeroStat
          label="PU Ofertado"
          value={`R$ ${offer.offeredPU.toFixed(2)}`}
          sub={`justo R$ ${(asset.puJusto ?? asset.currentPU).toFixed(2)}`}
          highlight
        />
        <HeroStat
          label="Yield Bruto"
          value={formatPercent(yieldBruto)}
          sub={
            indexer === "CDI"
              ? `${((yieldBruto / cdiNoVertice) * 100).toFixed(1)}% CDI`
              : indexer === "IPCA"
                ? "juro real"
                : "pré-fixado"
          }
          highlight
        />
        <HeroStat
          label="Spread (justo)"
          value={`${(offer.agioDeagioBps ?? 0) >= 0 ? "+" : ""}${(offer.agioDeagioBps ?? 0).toFixed(0)} bps`}
          sub={(offer.agioDeagioBps ?? 0) >= 0 ? "pickup" : "give-up"}
          positive={(offer.agioDeagioBps ?? 0) >= 0}
        />
        <HeroStat
          label="Volume"
          value={formatCurrency(offer.volume, 0)}
          sub={`${offer.quantity.toLocaleString("pt-BR")} unid.`}
        />
        <HeroStat
          label="Duration"
          value={`${(asset.duration ?? 0).toFixed(2)}y`}
          sub={`DV01 R$ ${(asset.dv01 ?? 0).toFixed(4)}`}
        />
        <HeroStat
          label="Dias até venc."
          value={`${dtm}d`}
          sub={`${(dtm / 365).toFixed(2)} anos · ${du}du`}
        />
        <HeroStat
          label="vs CDI (líq. PF)"
          value={`${((offer.percentCDILiquido ?? 0)).toFixed(0)}%`}
          sub={`CDI ${formatPercent(CDI_ANUAL)}`}
          positive={(offer.percentCDILiquido ?? 0) >= 100}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4 min-w-0">
          {/* Asset & issuer details */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle>Detalhes do Ativo</CardTitle>
                <div className="text-xs text-muted-foreground mt-1">
                  Características, emissor e estrutura
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AssetTypeChip type={asset.type} />
                <RatingPill rating={asset.issuer.rating} />
                {asset.isIncentivada ? (
                  <span className="inline-flex items-center justify-center rounded-sm border border-primary/40 bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-mono font-semibold tracking-wider uppercase">
                    Lei 12.431
                  </span>
                ) : null}
                <StatusBadge status={offer.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                <DetailRow icon={<Layers className="h-3.5 w-3.5" />} label="Ticker" value={asset.ticker} />
                <DetailRow icon={<Layers className="h-3.5 w-3.5" />} label="ISIN" value={asset.isin ?? "—"} mono />
                <DetailRow icon={<Building2 className="h-3.5 w-3.5" />} label="Emissor" value={asset.issuer.name} />
                <DetailRow icon={<Building2 className="h-3.5 w-3.5" />} label="CNPJ" value={asset.issuer.cnpj} mono />
                <DetailRow icon={<Building2 className="h-3.5 w-3.5" />} label="Setor" value={asset.issuer.sector} />
                <DetailRow icon={<Calendar className="h-3.5 w-3.5" />} label="Emissão" value={formatDateBR(asset.issueDate)} />
                <DetailRow icon={<Calendar className="h-3.5 w-3.5" />} label="Vencimento" value={formatDateBR(asset.maturity)} />
                <DetailRow icon={<Coins className="h-3.5 w-3.5" />} label="Face Value" value={`R$ ${asset.faceValue.toFixed(2)}`} mono />
                <DetailRow icon={<Percent className="h-3.5 w-3.5" />} label="Indexador" value={asset.indexer} />
                <DetailRow
                  icon={<Percent className="h-3.5 w-3.5" />}
                  label={indexer === "CDI" ? "% CDI contratado" : indexer === "IPCA" ? "Cupom real" : "Taxa Pré"}
                  value={
                    indexer === "CDI"
                      ? `${(asset.percentCDI ?? asset.originalRate * 100).toFixed(2)}%`
                      : formatPercent(
                          indexer === "IPCA"
                            ? (asset.cupomReal ?? asset.originalRate)
                            : asset.originalRate,
                        )
                  }
                  mono
                />
                {asset.vna ? (
                  <DetailRow
                    icon={<Coins className="h-3.5 w-3.5" />}
                    label="VNA atualizado"
                    value={`R$ ${asset.vna.toFixed(2)}`}
                    mono
                  />
                ) : null}
                <DetailRow icon={<Calendar className="h-3.5 w-3.5" />} label="Pagto Cupom" value={asset.couponFreq ?? "—"} />
                <DetailRow icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Custódia" value="B3 / Cetip" />
                <DetailRow icon={<Gauge className="h-3.5 w-3.5" />} label="Spread de crédito" value={`${(asset.spreadCreditoBps ?? 0).toFixed(0)} bps`} mono />
                <DetailRow icon={<Gauge className="h-3.5 w-3.5" />} label="Duration mod." value={`${(asset.durationModificada ?? 0).toFixed(2)}y`} mono />
              </div>
            </CardContent>
          </Card>

          {/* Yield + spread panel (client) */}
          <YieldSpreadPanel offer={offer} />

          {/* Charts tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Análise de Mercado</CardTitle>
              <div className="text-xs text-muted-foreground mt-1">
                Trajetória de taxas e túnel histórico para o ativo
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="executed">
                <TabsList>
                  <TabsTrigger value="executed">Taxas Executadas</TabsTrigger>
                  <TabsTrigger value="tunnel">Túnel Histórico</TabsTrigger>
                </TabsList>
                <TabsContent value="executed">
                  <ExecutedRatesChart data={executedData} />
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mt-2">
                    Fonte: book histórico FIXMATCH · 36 dias · 18 pontos
                  </div>
                </TabsContent>
                <TabsContent value="tunnel">
                  <RateTunnelChart data={tunnelData} offeredRate={yieldBruto} />
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mt-2">
                    Banda de ±45bps · linha de oferta destacada em amarelo
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* PU comparison */}
          <PUComparison
            faceValue={asset.faceValue}
            currentPU={asset.puJusto ?? asset.currentPU}
            offeredPU={offer.offeredPU}
          />

          {/* Risk notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                Notas de Risco e Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <RiskItem
                level="info"
                title="Risco de crédito"
                body={`Emissor ${asset.issuer.name} possui rating ${asset.issuer.rating} · spread de crédito modelado em ${(asset.spreadCreditoBps ?? 0).toFixed(0)} bps. Considere exposição setorial em ${asset.issuer.sector}.`}
              />
              <RiskItem
                level="info"
                title="Risco de mercado · duration"
                body={`Duration mod. ${(asset.durationModificada ?? 0).toFixed(2)} anos · DV01 ≈ R$ ${(asset.dv01 ?? 0).toFixed(4)} por unidade. Um deslocamento paralelo de +100bps na curva reduziria o PU em ${(((asset.durationModificada ?? 0) * 0.01) * 100).toFixed(2)}%.`}
              />
              <RiskItem
                level="warning"
                title="Liquidez secundária"
                body="Renda fixa corporativa pode apresentar baixa liquidez. Avalie carregamento até o vencimento e o impacto no DV01."
              />
              <RiskItem
                level="info"
                title="Tributação"
                body={
                  asset.isIncentivada
                    ? "Debênture incentivada (Lei 12.431): isenta de IR para PF. PJ tributada normalmente."
                    : asset.type === "LCI" || asset.type === "LCA" || asset.type === "CRI" || asset.type === "CRA"
                      ? `${asset.type} é isento de IR para PF. PJ tributada pela tabela regressiva.`
                      : "IR regressivo 22,5% → 15% conforme prazo (tabela Lei 11.033)."
                }
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column: offer + buy intent */}
        <div className="space-y-4">
          <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.06] to-transparent">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Oferta do Vendedor</CardTitle>
                <div className="text-xs text-muted-foreground mt-1">
                  {offer.sellerType} · {offer.sellerId}
                </div>
              </div>
              <MatchScore score={offer.matchScore} size="lg" showLabel />
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StatRow label="PU ofertado" value={`R$ ${offer.offeredPU.toFixed(2)}`} mono />
              <StatRow
                label={indexer === "CDI" ? "Taxa (% CDI)" : "Yield bruto a.a."}
                value={
                  indexer === "CDI"
                    ? `${((yieldBruto / cdiNoVertice) * 100).toFixed(1)}% CDI`
                    : formatPercent(yieldBruto)
                }
                highlight
                mono
              />
              <StatRow label="Quantidade" value={offer.quantity.toLocaleString("pt-BR")} mono />
              <StatRow label="Volume" value={formatCurrency(offer.volume, 0)} mono />
              <Separator />
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground inline-flex items-center gap-1">
                  <Gauge className="h-3.5 w-3.5" /> Urgência
                </span>
                <UrgencyIndicator urgency={offer.urgency} />
              </div>
              <StatRow label="Criada em" value={formatDateBR(offer.createdAt)} mono />
              <StatRow label="Expira em" value={formatDateBR(offer.expiresAt)} mono />
              {offer.reasonForSale ? (
                <div className="pt-2 border-t border-terminal-border">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Motivo da venda
                  </div>
                  <div className="text-xs italic text-foreground/80">
                    “{offer.reasonForSale}”
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div id="intent">
            <BuyIntentForm offer={offer} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  sub,
  highlight,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="rounded-md border border-terminal-border bg-terminal-panel/70 px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
        {label}
      </div>
      <div
        className={`text-lg md:text-xl font-mono tabular-nums font-semibold mt-1 ${
          highlight ? "text-primary" : positive ? "text-positive" : "text-foreground"
        }`}
      >
        {value}
      </div>
      {sub ? (
        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{sub}</div>
      ) : null}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
        {icon} {label}
      </span>
      <span className={mono ? "font-mono tabular-nums text-sm" : "text-sm"}>{value}</span>
    </div>
  );
}

function StatRow({
  label,
  value,
  positive,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  positive?: boolean;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={`${mono ? "font-mono tabular-nums" : ""} ${
          highlight ? "text-primary font-semibold" : positive ? "text-positive" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function RiskItem({
  level,
  title,
  body,
}: {
  level: "info" | "warning" | "critical";
  title: string;
  body: string;
}) {
  const color =
    level === "critical"
      ? "border-destructive/30 bg-destructive/[0.04]"
      : level === "warning"
        ? "border-warning/30 bg-warning/[0.04]"
        : "border-terminal-border bg-terminal-bg/40";
  return (
    <div className={`rounded-md border ${color} p-3`}>
      <div className="text-xs font-semibold mb-1">{title}</div>
      <div className="text-xs text-muted-foreground leading-relaxed">{body}</div>
    </div>
  );
}
