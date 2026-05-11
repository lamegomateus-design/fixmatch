import { Badge } from "@/components/ui/badge";
import type { OfferStatus } from "@/types";

const map: Record<
  OfferStatus,
  { variant: "default" | "positive" | "warning" | "info" | "destructive" | "muted"; label: string }
> = {
  Disponível: { variant: "positive", label: "Disponível" },
  "Em negociação": { variant: "info", label: "Em negociação" },
  Executada: { variant: "muted", label: "Executada" },
  Cancelada: { variant: "destructive", label: "Cancelada" },
  Pendente: { variant: "warning", label: "Pendente" },
};

export function StatusBadge({ status }: { status: OfferStatus }) {
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}
