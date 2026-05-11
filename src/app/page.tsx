import {
  BookOpen,
  Coins,
  LineChart,
  Percent,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VolumeChart } from "@/components/dashboard/volume-chart";
import { AssetMixChart } from "@/components/dashboard/asset-mix-chart";
import { BestOpportunities } from "@/components/dashboard/best-opportunities";
import { RecentTrades } from "@/components/dashboard/recent-trades";
import { offers } from "@/data/offers";
import { formatCurrency, formatPercent } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  const available = offers.filter((o) => o.status === "Disponível");
  const totalOffers = available.length;
  const totalVolume = available.reduce((s, o) => s + o.volume, 0);
  const avgYield =
    available.reduce((s, o) => s + o.offeredRate, 0) / Math.max(1, available.length);
  const highUrgency = available.filter((o) => o.urgency === "Alta").length;

  return (
    <div className="space-y-6 max-w-[1480px] mx-auto">
      <PageHeader
        tag="Dashboard · Visão Geral"
        title="Mercado Secundário de Renda Fixa"
        subtitle="Acompanhe ofertas ativas, volume financeiro, taxas implícitas e melhores oportunidades em tempo real. FIXMATCH conecta vendedores e compradores institucionais."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/sell">Listar Ativo</Link>
            </Button>
            <Button asChild>
              <Link href="/offer-book">Abrir Livro</Link>
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Ofertas Disponíveis"
          value={totalOffers.toString()}
          delta={{ value: "+12 hoje", positive: true }}
          footnote="vs. ontem"
          icon={<BookOpen className="h-4 w-4" />}
          accent="primary"
        />
        <MetricCard
          label="Volume Financeiro"
          value={formatCurrency(totalVolume, 0)}
          delta={{ value: "+R$ 4,8M", positive: true }}
          footnote="ofertado no livro"
          icon={<Coins className="h-4 w-4" />}
        />
        <MetricCard
          label="Taxa Média Ofertada"
          value={formatPercent(avgYield)}
          delta={{ value: "+0,12 p.p.", positive: true }}
          footnote="vs. semana anterior"
          icon={<Percent className="h-4 w-4" />}
        />
        <MetricCard
          label="Alta Urgência"
          value={highUrgency.toString()}
          footnote="vendedores com pressa"
          icon={<ShieldAlert className="h-4 w-4" />}
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Volume Negociado · 10 dias</CardTitle>
              <div className="text-xs text-muted-foreground mt-1">
                Em milhões de R$ · liquidação D+0
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total acumulado</div>
              <div className="font-mono text-lg text-primary">R$ 174,3M</div>
            </div>
          </CardHeader>
          <CardContent>
            <VolumeChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Composição do Livro</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Distribuição por classe de ativo
            </div>
          </CardHeader>
          <CardContent>
            <AssetMixChart />
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <BestOpportunities />
          <RecentTrades />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumo de Mercado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Curva DI 2027
                </div>
                <div className="font-mono tabular-nums">12,18% <span className="text-positive">+0,04</span></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Curva DI 2030
                </div>
                <div className="font-mono tabular-nums">12,52% <span className="text-positive">+0,02</span></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <LineChart className="h-3.5 w-3.5 text-info" />
                  IPCA+ 2035
                </div>
                <div className="font-mono tabular-nums">6,38% <span className="text-negative">-0,03</span></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Coins className="h-3.5 w-3.5 text-warning" />
                  Spread médio CDB AA
                </div>
                <div className="font-mono tabular-nums">CDI + 1,8%</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Coins className="h-3.5 w-3.5 text-warning" />
                  Deságio médio (livro)
                </div>
                <div className="font-mono tabular-nums text-positive">-1,42%</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integrações Futuras</CardTitle>
              <div className="text-xs text-muted-foreground mt-1">
                Placeholder · roadmap institucional
              </div>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-muted-foreground">
              <div className="flex items-center justify-between font-mono">
                <span>Custódia BTG / B3</span>
                <span className="text-warning">em homologação</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span>Preço em tempo real ANBIMA</span>
                <span className="text-warning">em homologação</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span>KYC / Onboarding</span>
                <span className="text-info">conectado · sandbox</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span>Liquidação Cetip / B3</span>
                <span className="text-info">conectado · sandbox</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
