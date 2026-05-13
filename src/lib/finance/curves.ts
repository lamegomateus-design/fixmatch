/**
 * Curvas de referência para precificação e cálculo de spread.
 *
 * Disponíveis:
 *   1. DI_B3   → DI Futuro B3 (curva pré-fixada, base 252)
 *   2. ANBIMA  → ETTJ Pré, ETTJ IPCA real e %CDI implícito derivado da DI
 *
 * Cenário ancorado em CDI = 14,40% a.a. (constants.ts). A curva DI
 * abre (inclinada) chegando perto de 16% no 10Y com concavidade no
 * meio. A ETTJ Pré da ANBIMA fica ~20–30 bps abaixo da DI (soberano).
 * A ETTJ IPCA (juro real) começa em ~7% e abre para ~8% no longo.
 */

import type { CurvaReferencia, FonteCurva, Indexador } from "@/types";
import { CDI_ANUAL } from "./constants";

const HOJE = new Date("2026-05-11T00:00:00Z");

/**
 * Vértices padrão em dias úteis. ~21du/mês ANBIMA.
 *   1m=21, 3m=63, 6m=126, 1Y=252, 2Y=504, 3Y=756, 4Y=1008,
 *   5Y=1260, 7Y=1764, 10Y=2520.
 */
const VERT_DU = [21, 63, 126, 252, 504, 756, 1008, 1260, 1764, 2520];

/** DI Futuro B3 — curva pré inclinada ancorada em CDI corrente. */
export const CURVA_DI_B3: CurvaReferencia = {
  fonte: "DI_B3",
  indexador: "PRE",
  dataReferencia: HOJE,
  vertices: VERT_DU.map((du, i) => ({
    duDias: du,
    // Anchored: 1m ≈ CDI; depois sobe com leve concavidade até ~16% no 10Y.
    taxa:
      CDI_ANUAL +
      [0.0, 0.0008, 0.0024, 0.0058, 0.0095, 0.0118, 0.0135, 0.0148, 0.0162, 0.0192][i],
  })),
};

/** ETTJ Pré ANBIMA — ~20 bps abaixo da DI no curto, fechando para ~30 bps no longo. */
export const CURVA_ANBIMA_PRE: CurvaReferencia = {
  fonte: "ANBIMA",
  indexador: "PRE",
  dataReferencia: HOJE,
  vertices: VERT_DU.map((du, i) => ({
    duDias: du,
    taxa:
      CDI_ANUAL +
      [-0.0015, -0.0008, 0.0012, 0.0042, 0.0078, 0.0098, 0.0114, 0.0125, 0.0138, 0.0162][i],
  })),
};

/** ETTJ IPCA ANBIMA — juro real, abre de ~7% no curto pra ~8% no longo. */
export const CURVA_ANBIMA_IPCA: CurvaReferencia = {
  fonte: "ANBIMA",
  indexador: "IPCA",
  dataReferencia: HOJE,
  vertices: [
    { duDias: 126, taxa: 0.07 },
    { duDias: 252, taxa: 0.0715 },
    { duDias: 504, taxa: 0.0735 },
    { duDias: 756, taxa: 0.0752 },
    { duDias: 1008, taxa: 0.0765 },
    { duDias: 1260, taxa: 0.0775 },
    { duDias: 1764, taxa: 0.0788 },
    { duDias: 2520, taxa: 0.08 },
  ],
};

/**
 * Curva %CDI implícita derivada da DI. Para um vértice de prazo `du`,
 * o CDI projetado é a própria taxa do vértice DI (curva pré ≈ CDI esperado).
 * Esta curva é exposta como Indexador "CDI" para o engine de spread.
 */
export const CURVA_CDI_IMPLICITA: CurvaReferencia = {
  fonte: "DI_B3",
  indexador: "CDI",
  dataReferencia: HOJE,
  vertices: CURVA_DI_B3.vertices.map((v) => ({ ...v })),
};

/**
 * Interpola linearmente entre os vértices de uma curva. Para `duAlvo`
 * fora dos extremos, usa a taxa do vértice mais próximo (flat extrap).
 *
 *   taxa(du) = taxa_i + (taxa_{i+1} - taxa_i) × (du - du_i) / (du_{i+1} - du_i)
 *
 * @param curva Curva de referência.
 * @param duAlvo Dias úteis-alvo.
 */
export function interpolarCurva(
  curva: CurvaReferencia,
  duAlvo: number,
): number {
  const v = curva.vertices;
  if (v.length === 0) return 0;
  if (duAlvo <= v[0].duDias) return v[0].taxa;
  if (duAlvo >= v[v.length - 1].duDias) return v[v.length - 1].taxa;
  for (let i = 0; i < v.length - 1; i++) {
    const a = v[i];
    const b = v[i + 1];
    if (duAlvo >= a.duDias && duAlvo <= b.duDias) {
      const ratio = (duAlvo - a.duDias) / (b.duDias - a.duDias);
      return a.taxa + (b.taxa - a.taxa) * ratio;
    }
  }
  return v[v.length - 1].taxa;
}

/**
 * Seleciona a curva ativa para um (fonte, indexador) específico.
 *
 *   DI_B3  + PRE  → CURVA_DI_B3
 *   DI_B3  + CDI  → CURVA_CDI_IMPLICITA (derivada da DI)
 *   DI_B3  + IPCA → CURVA_ANBIMA_IPCA   (DI não tem IPCA; cai na ANBIMA)
 *   ANBIMA + PRE  → CURVA_ANBIMA_PRE
 *   ANBIMA + CDI  → CURVA_CDI_IMPLICITA
 *   ANBIMA + IPCA → CURVA_ANBIMA_IPCA
 */
export function getCurvaPara(
  fonte: FonteCurva,
  indexador: Indexador,
): CurvaReferencia {
  if (indexador === "IPCA") return CURVA_ANBIMA_IPCA;
  if (indexador === "CDI") return CURVA_CDI_IMPLICITA;
  // PRE
  return fonte === "ANBIMA" ? CURVA_ANBIMA_PRE : CURVA_DI_B3;
}

/**
 * CDI projetado para um prazo (interpola a curva DI no vértice
 * correspondente). Útil para precificar %CDI.
 */
export function cdiProjetadoPara(duAlvo: number): number {
  return interpolarCurva(CURVA_DI_B3, duAlvo);
}
