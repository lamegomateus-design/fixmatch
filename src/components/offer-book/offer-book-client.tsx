"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Filter,
  Search,
  Star,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AssetTypeChip } from "@/components/shared/asset-type-chip";
import { RatingPill } from "@/components/shared/rating-pill";
import { UrgencyIndicator } from "@/components/shared/urgency-indicator";
import { MatchScore } from "@/components/shared/match-score";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  formatCurrency,
  formatDateBR,
  formatPercent,
} from "@/lib/finance";
import type { AssetType, Offer, RatingTier } from "@/types";
import { cn } from "@/lib/utils";

type SortKey =
  | "matchScore"
  | "offeredRate"
  | "offeredPU"
  | "agioDeagioPct"
  | "volume"
  | "maturity";

const ASSET_TYPES: (AssetType | "Todos")[] = [
  "Todos",
  "CDB",
  "LCI",
  "LCA",
  "Debênture",
  "CRI",
  "CRA",
  "Tesouro",
];

const RATING_BUCKETS: { value: string; label: string; ratings: RatingTier[] }[] = [
  { value: "all", label: "Todos os ratings", ratings: [] },
  {
    value: "investment-high",
    label: "AAA – AA",
    ratings: ["AAA", "AA+", "AA", "AA-"],
  },
  {
    value: "investment-mid",
    label: "A+ – A-",
    ratings: ["A+", "A", "A-"],
  },
  {
    value: "investment-low",
    label: "BBB e abaixo",
    ratings: ["BBB+", "BBB", "BBB-", "BB", "B"],
  },
];

interface Props {
  offers: Offer[];
}

export function OfferBookClient({ offers }: Props) {
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState<AssetType | "Todos">("Todos");
  const [rating, setRating] = React.useState("all");
  const [urgencyFilter, setUrgencyFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("ativos");
  const [yieldRange, setYieldRange] = React.useState<[number]>([10]);
  const [sortKey, setSortKey] = React.useState<SortKey>("matchScore");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const filtered = React.useMemo(() => {
    const yieldMin = yieldRange[0] / 100;
    const ratingBucket = RATING_BUCKETS.find((r) => r.value === rating);
    return offers
      .filter((o) => {
        if (statusFilter === "ativos") {
          if (!(o.status === "Disponível" || o.status === "Em negociação")) return false;
        } else if (statusFilter !== "all" && o.status !== statusFilter) {
          return false;
        }
        if (type !== "Todos" && o.asset.type !== type) return false;
        if (
          ratingBucket &&
          ratingBucket.ratings.length > 0 &&
          !ratingBucket.ratings.includes(o.asset.issuer.rating)
        )
          return false;
        if (urgencyFilter !== "all" && o.urgency !== urgencyFilter) return false;
        if (o.offeredRate < yieldMin) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const haystack =
            `${o.asset.ticker} ${o.asset.issuer.name} ${o.asset.isin ?? ""} ${o.asset.type}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        const av = (a as any)[sortKey];
        const bv = (b as any)[sortKey];
        if (sortKey === "maturity") {
          return (
            (new Date(a.asset.maturity).getTime() -
              new Date(b.asset.maturity).getTime()) *
            dir
          );
        }
        return (av - bv) * dir;
      });
  }, [offers, search, type, rating, urgencyFilter, statusFilter, yieldRange, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function resetFilters() {
    setSearch("");
    setType("Todos");
    setRating("all");
    setUrgencyFilter("all");
    setStatusFilter("ativos");
    setYieldRange([10]);
    setSortKey("matchScore");
    setSortDir("desc");
  }

  const totalVolume = filtered.reduce((s, o) => s + o.volume, 0);
  const avgRate =
    filtered.length > 0
      ? filtered.reduce((s, o) => s + o.offeredRate, 0) / filtered.length
      : 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4">
      <Card className="h-fit xl:sticky xl:top-20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" /> Filtros
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs">
            <X className="h-3 w-3 mr-1" /> Limpar
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>Busca</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Ticker, emissor, ISIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Classe de Ativo</Label>
            <Select value={type} onValueChange={(v) => setType(v as AssetType | "Todos")}>
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
            <Label>Rating</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATING_BUCKETS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Urgência do Vendedor</Label>
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativos">Apenas ativos</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Disponível">Disponível</SelectItem>
                <SelectItem value="Em negociação">Em negociação</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Executada">Executada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Taxa mínima</Label>
              <span className="font-mono text-xs tabular-nums text-primary">
                {yieldRange[0].toFixed(1)}%
              </span>
            </div>
            <Slider
              value={yieldRange}
              onValueChange={(v) => setYieldRange([v[0]])}
              min={0}
              max={18}
              step={0.5}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>0%</span>
              <span>9%</span>
              <span>18%</span>
            </div>
          </div>

          <Separator />

          <div className="text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ofertas exibidas</span>
              <span className="font-mono tabular-nums">{filtered.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volume total</span>
              <span className="font-mono tabular-nums">
                {formatCurrency(totalVolume, 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa média</span>
              <span className="font-mono tabular-nums text-primary">
                {formatPercent(avgRate)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>Livro de Ofertas · Live</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              {filtered.length} ofertas · ordenado por {sortKey === "matchScore" ? "match score" : sortKey} ({sortDir === "desc" ? "↓" : "↑"})
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="positive" className="animate-pulse">● Live</Badge>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="matchScore">Match Score</SelectItem>
                <SelectItem value="offeredRate">Taxa Ofertada</SelectItem>
                <SelectItem value="offeredPU">PU Ofertado</SelectItem>
                <SelectItem value="agioDeagioPct">Ágio / Deságio</SelectItem>
                <SelectItem value="volume">Volume</SelectItem>
                <SelectItem value="maturity">Vencimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Match</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Emissor</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Venc.</TableHead>
                <TableHead className="text-right">
                  <SortHeader
                    active={sortKey === "offeredPU"}
                    dir={sortDir}
                    onClick={() => toggleSort("offeredPU")}
                  >
                    PU
                  </SortHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader
                    active={sortKey === "offeredRate"}
                    dir={sortDir}
                    onClick={() => toggleSort("offeredRate")}
                  >
                    Taxa
                  </SortHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader
                    active={sortKey === "agioDeagioPct"}
                    dir={sortDir}
                    onClick={() => toggleSort("agioDeagioPct")}
                  >
                    Ágio/Deságio
                  </SortHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader
                    active={sortKey === "volume"}
                    dir={sortDir}
                    onClick={() => toggleSort("volume")}
                  >
                    Volume
                  </SortHeader>
                </TableHead>
                <TableHead>Urgência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <MatchScore score={o.matchScore} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <Link
                        href={`/offer-book/${o.id}`}
                        className="font-mono text-sm font-semibold hover:text-primary"
                      >
                        {o.asset.ticker}
                      </Link>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {o.asset.isin}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <AssetTypeChip type={o.asset.type} />
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">
                    {o.asset.issuer.name}
                  </TableCell>
                  <TableCell>
                    <RatingPill rating={o.asset.issuer.rating} />
                  </TableCell>
                  <TableCell className="font-mono tabular-nums text-xs">
                    {formatDateBR(o.asset.maturity)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    <div className="leading-tight">
                      <div>{o.offeredPU.toFixed(2)}</div>
                      <div className="text-[10px] text-muted-foreground">
                        atual {o.asset.currentPU.toFixed(2)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    <div className="leading-tight">
                      <div className="text-primary font-semibold">
                        {formatPercent(o.offeredRate)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        orig. {formatPercent(o.asset.originalRate)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono tabular-nums",
                      o.agioDeagioPct < 0 ? "text-positive" : "text-warning",
                    )}
                  >
                    {(o.agioDeagioPct * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-xs">
                    {formatCurrency(o.volume, 0)}
                  </TableCell>
                  <TableCell>
                    <UrgencyIndicator urgency={o.urgency} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-7">
                        <Link href={`/offer-book/${o.id}`}>Negociar</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-muted-foreground py-12">
                    Nenhuma oferta encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SortHeader({
  children,
  active,
  dir,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground transition-colors",
        active && "text-primary",
      )}
    >
      {children}
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowDownUp className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}
