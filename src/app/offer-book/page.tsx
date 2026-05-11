import { PageHeader } from "@/components/layout/page-header";
import { OfferBookClient } from "@/components/offer-book/offer-book-client";
import { offers } from "@/data/offers";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OfferBookPage() {
  return (
    <div className="space-y-6 max-w-[1480px] mx-auto">
      <PageHeader
        tag="Livro de Ofertas"
        title="Livro Eletrônico Secundário"
        subtitle="Visualize todas as ofertas de venda institucionais e PF qualificadas. Filtre, ordene e analise PU, taxa, ágio/deságio e Match Score antes de iniciar uma negociação."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/simulator">Abrir Simulador</Link>
            </Button>
            <Button asChild>
              <Link href="/sell">Listar Oferta</Link>
            </Button>
          </>
        }
      />
      <OfferBookClient offers={offers} />
    </div>
  );
}
