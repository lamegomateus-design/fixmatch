/**
 * Match Score 0–100 entre uma oferta de venda e uma demanda de compra.
 *
 * Componentes ponderados (soma = 100):
 *   1. Aderência de taxa       (40 pts)
 *   2. Aderência de duration   (25 pts)
 *   3. Casamento de volume     (20 pts)
 *   4. Compatibilidade rating  (10 pts)
 *   5. Urgência do vendedor    ( 5 pts)
 */

import type {
  Demanda,
  MatchScoreBreakdown,
  Offer,
  RatingTier,
} from "@/types";

/** Ordem de rating (índice menor = melhor crédito). */
const RATING_ORDER: RatingTier[] = [
  "AAA",
  "AA+",
  "AA",
  "AA-",
  "A+",
  "A",
  "A-",
  "BBB+",
  "BBB",
  "BBB-",
  "BB",
  "B",
];

function rankRating(r: RatingTier): number {
  const idx = RATING_ORDER.indexOf(r);
  return idx === -1 ? RATING_ORDER.length : idx;
}

/**
 * (40 pts) Aderência da taxa ofertada em relação à taxa desejada.
 * Quanto mais a oferta passa da desejada, melhor. Quando fica abaixo,
 * pontuação decai linearmente até zerar em -50 bps.
 *
 *   delta_bps = (taxaOfertada - taxaDesejada) × 10.000
 *   score = clamp(40 × (delta_bps + 50) / 100, 0, 40)
 *
 * Sem `taxaDesejada` na demanda, retornamos meio peso (20 pts) — neutro.
 */
function scoreTaxa(offer: Offer, demanda: Demanda): number {
  if (demanda.taxaDesejada == null) return 20;
  const oferecido =
    offer.yieldBrutoAnual ?? offer.offeredRate;
  const delta = (oferecido - demanda.taxaDesejada) * 10_000; // bps
  const raw = (40 * (delta + 50)) / 100;
  return clamp(raw, 0, 40);
}

/**
 * (25 pts) Aderência de duration. Penaliza distância absoluta entre a
 * duration ofertada e a desejada.
 *
 *   delta = |duration_oferta - duration_alvo|
 *   score = 25 × max(0, 1 - delta / 3)   (perde tudo a partir de 3 anos)
 *
 * Sem duration calculada na oferta, retornamos 12,5 (neutro).
 */
function scoreDuration(offer: Offer, demanda: Demanda): number {
  const dur = offer.asset.duration;
  if (dur == null || demanda.durationDesejado == null) return 12.5;
  const delta = Math.abs(dur - demanda.durationDesejado);
  return 25 * Math.max(0, 1 - delta / 3);
}

/**
 * (20 pts) Casamento de volume.
 *   - Oferta cobre 100% do volume buscado → 20 pts.
 *   - Cobre parcialmente → 20 × cobertura.
 *   - Excede o buscado → ainda 20 pts (compradores podem fracionar).
 *
 * Sem volume buscado, retornamos 10 (neutro).
 */
function scoreVolume(offer: Offer, demanda: Demanda): number {
  if (demanda.volumeBuscado == null || demanda.volumeBuscado <= 0) return 10;
  const cobertura = Math.min(1, offer.volume / demanda.volumeBuscado);
  return 20 * cobertura;
}

/**
 * (10 pts) Compatibilidade de rating. Rating ofertado precisa ser ≥
 * ao mínimo aceito pelo comprador.
 *   - Igual ou melhor → 10 pts.
 *   - 1 notch abaixo  → 4 pts.
 *   - 2+ notches abaixo → 0 pts.
 *
 * Sem rating mínimo na demanda, retornamos 5 (neutro).
 */
function scoreRating(offer: Offer, demanda: Demanda): number {
  if (!demanda.ratingMinimo) return 5;
  const rankOf = rankRating(offer.asset.issuer.rating);
  const rankMin = rankRating(demanda.ratingMinimo);
  if (rankOf <= rankMin) return 10;
  if (rankOf - rankMin === 1) return 4;
  return 0;
}

/**
 * (5 pts) Bônus de urgência do vendedor — quanto mais urgente, maior a
 * chance de espaço para barganha. Compradores apreciam.
 */
function scoreUrgencia(offer: Offer): number {
  switch (offer.urgency) {
    case "Alta":
      return 5;
    case "Média":
      return 3;
    default:
      return 1;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Match score 0–100 entre uma oferta e uma demanda. Sem demanda
 * informada, devolve um score "perfil genérico" útil para o livro.
 */
export function calcularMatchScore(offer: Offer, demanda: Demanda = {}): number {
  return calcularMatchScoreBreakdown(offer, demanda).total;
}

/** Versão detalhada para a UI exibir explicação do score. */
export function calcularMatchScoreBreakdown(
  offer: Offer,
  demanda: Demanda = {},
): MatchScoreBreakdown {
  const taxa = scoreTaxa(offer, demanda);
  const duration = scoreDuration(offer, demanda);
  const volume = scoreVolume(offer, demanda);
  const rating = scoreRating(offer, demanda);
  const urgencia = scoreUrgencia(offer);
  const total = Math.round(taxa + duration + volume + rating + urgencia);
  return {
    total: clamp(total, 0, 100),
    componentes: { taxa, duration, volume, rating, urgencia },
  };
}
