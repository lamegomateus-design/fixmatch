"use client";

import * as React from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  XCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { AdminOperationItem } from "@/types";
import { formatCurrency, formatDateTimeBR } from "@/lib/finance";
import { cn } from "@/lib/utils";

const statusBadge: Record<
  AdminOperationItem["status"],
  { variant: "positive" | "info" | "warning" | "destructive" | "muted"; icon: React.ReactNode }
> = {
  "Em análise": { variant: "info", icon: <Clock className="h-3 w-3" /> },
  Aprovado: { variant: "positive", icon: <CheckCircle2 className="h-3 w-3" /> },
  Rejeitado: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  Aguardando: { variant: "warning", icon: <Clock className="h-3 w-3" /> },
  Concluído: { variant: "muted", icon: <CheckCircle2 className="h-3 w-3" /> },
  Bloqueado: { variant: "destructive", icon: <AlertOctagon className="h-3 w-3" /> },
};

interface Props {
  items: AdminOperationItem[];
}

export function OperationsTable({ items }: Props) {
  const [filter, setFilter] = React.useState<string>("all");

  const filtered = items.filter((i) => {
    if (filter === "all") return true;
    return i.type === filter;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" /> Esteira de Operações
          </CardTitle>
          <div className="text-xs text-muted-foreground mt-1">
            {filtered.length} item(ns) na esteira · atualizado em tempo real
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[200px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="Oferta pendente">Oferta pendente</SelectItem>
              <SelectItem value="Oferta aprovada">Oferta aprovada</SelectItem>
              <SelectItem value="Trade matchado">Trade matchado</SelectItem>
              <SelectItem value="Liquidação">Liquidação</SelectItem>
              <SelectItem value="Custódia">Custódia</SelectItem>
              <SelectItem value="KYC">KYC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Contraparte</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Severidade</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => {
              const s = statusBadge[item.status];
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.id.toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.asset}</TableCell>
                  <TableCell className="text-xs">{item.party}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-xs">
                    {item.amount > 0 ? formatCurrency(item.amount, 0) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.variant} className="inline-flex items-center gap-1">
                      {s.icon}
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <SeverityChip severity={item.severity ?? "info"} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatDateTimeBR(item.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SeverityChip({
  severity,
}: {
  severity: "info" | "warning" | "critical";
}) {
  const map = {
    info: { color: "bg-info/15 text-info", icon: <CheckCircle2 className="h-3 w-3" />, label: "Info" },
    warning: { color: "bg-warning/15 text-warning", icon: <AlertTriangle className="h-3 w-3" />, label: "Atenção" },
    critical: { color: "bg-destructive/15 text-destructive", icon: <AlertOctagon className="h-3 w-3" />, label: "Crítico" },
  };
  const m = map[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider",
        m.color,
      )}
    >
      {m.icon}
      {m.label}
    </span>
  );
}
