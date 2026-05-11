import { PageHeader } from "@/components/layout/page-header";
import { Simulator } from "@/components/simulator/simulator";

export default function SimulatorPage() {
  return (
    <div className="space-y-6 max-w-[1480px] mx-auto">
      <PageHeader
        tag="Simulador do Comprador"
        title="Calculadora de Retorno · Renda Fixa"
        subtitle="Simule a operação completa: PU de compra, indexador, alíquota de IR, vencimento e veja taxa anualizada, lucro líquido, comparação com CDI e preço de equilíbrio em tempo real."
      />
      <Simulator />
    </div>
  );
}
