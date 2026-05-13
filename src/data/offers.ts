import type { Offer } from "@/types";
import generated from "./generated.json";

/**
 * Universo de ofertas do MVP. Hidratado do snapshot determinístico em
 * `generated.json` (1 oferta por ativo, mesma seed do gerador).
 *
 * Cada oferta vem com PU, taxa bruta/líquida, spread vs curva,
 * ágio/deságio em bps, %CDI líquido e Match Score já calculados de
 * forma coerente pelo gerador.
 *
 * Para regenerar: `node scripts/generate-mocks.mjs`.
 */
export const offers: Offer[] = generated.offers as Offer[];

/** Top 5 oportunidades pelo Match Score (ofertas disponíveis). */
export const featuredOffers: Offer[] = offers
  .filter((o) => o.status === "Disponível")
  .sort((a, b) => b.matchScore - a.matchScore)
  .slice(0, 5);
