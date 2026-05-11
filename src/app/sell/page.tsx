import { PageHeader } from "@/components/layout/page-header";
import { SellFlow } from "@/components/seller/sell-flow";

export default function SellPage() {
  return (
    <div className="space-y-6 max-w-[1480px] mx-auto">
      <PageHeader
        tag="Fluxo do Vendedor"
        title="Listar Ativo para Venda"
        subtitle="Disponibilize um título de renda fixa que você já possui em custódia. O motor FIXMATCH calcula taxa implícita, deságio e probabilidade de match em tempo real."
      />
      <SellFlow />
    </div>
  );
}
