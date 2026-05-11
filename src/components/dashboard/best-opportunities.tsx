import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetTypeChip } from "@/components/shared/asset-type-chip";
import { MatchScore } from "@/components/shared/match-score";
import { RatingPill } from "@/components/shared/rating-pill";
import { featuredOffers } from "@/data/offers";
import { formatPercent } from "@/lib/finance";

export function BestOpportunities() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Melhores Oportunidades</CardTitle>
          <div className="text-xs text-muted-foreground mt-1">
            Ofertas com maior Match Score em tempo real
          </div>
        </div>
        <Link
          href="/offer-book"
          className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
        >
          Ver livro completo <ArrowUpRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {featuredOffers.map((o) => (
          <Link
            href={`/offer-book/${o.id}`}
            key={o.id}
            className="flex items-center gap-3 rounded-md border border-terminal-border bg-terminal-bg/40 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
          >
            <MatchScore score={o.matchScore} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold tracking-wide">
                  {o.asset.ticker}
                </span>
                <AssetTypeChip type={o.asset.type} />
                <RatingPill rating={o.asset.issuer.rating} />
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {o.asset.issuer.name} · Venc. {new Date(o.asset.maturity).toLocaleDateString("pt-BR")}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono tabular-nums text-primary font-semibold">
                {formatPercent(o.offeredRate)}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                taxa ofertada
              </div>
            </div>
            <div
              className={`text-right font-mono text-sm tabular-nums ${
                o.agioDeagioPct < 0 ? "text-positive" : "text-warning"
              }`}
            >
              {(o.agioDeagioPct * 100).toFixed(2)}%
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                ágio/deságio
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
