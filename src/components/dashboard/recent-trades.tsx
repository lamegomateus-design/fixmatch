import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AssetTypeChip } from "@/components/shared/asset-type-chip";
import { Badge } from "@/components/ui/badge";
import { recentTrades } from "@/data/trades";
import { formatCurrency, formatDateTimeBR, formatPercent } from "@/lib/finance";

const statusVariant: Record<string, "positive" | "info" | "warning"> = {
  Liquidada: "positive",
  Liquidando: "info",
  Pendente: "warning",
};

export function RecentTrades() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimas Negociações</CardTitle>
        <div className="text-xs text-muted-foreground mt-1">
          Trades executados nas últimas 24 horas
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hora</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">PU</TableHead>
              <TableHead className="text-right">Taxa</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentTrades.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                  {formatDateTimeBR(t.executedAt)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold">
                      {t.assetTicker}
                    </span>
                    <AssetTypeChip type={t.assetType} />
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {t.executedPU.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-primary">
                  {formatPercent(t.executedRate)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-xs">
                  {formatCurrency(t.volume, 0)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[t.status]}>{t.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
