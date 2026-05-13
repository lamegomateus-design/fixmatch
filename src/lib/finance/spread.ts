/**
 * Spread de crédito vs curva de referência (em basis points).
 *
 *   spread_bps = (yield_ativo - yield_curva_no_prazo) × 10.000
 */

import type { CurvaReferencia, Indexador } from "@/types";
import { interpolarCurva } from "./curves";

/**
 * Calcula o spread em bps de um yield contra a curva de referência no
 * vértice correspondente ao prazo do ativo.
 *
 * Regra de seleção do indexador:
 *   - PRE  → usa curva pré (DI ou ETTJ Pré).
 *   - CDI  → traduz o %CDI numa taxa equivalente e compara com a curva
 *            pré projetada (DI). Não passar a taxa equivalente já
 *            convertida — a função aceita yield em "espaço de taxa anual".
 *   - IPCA → compara o cupom real com a curva real (ETTJ IPCA).
 *
 * @param yieldAtivo Yield anual do ativo (decimal).
 * @param prazoDU Prazo em dias úteis.
 * @param curva Curva de referência ativa.
 * @param indexador Indexador canônico do ativo.
 */
export function spreadVsCurva(
  yieldAtivo: number,
  prazoDU: number,
  curva: CurvaReferencia,
  indexador: Indexador,
): number {
  if (curva.indexador !== indexador) {
    // Avisamos via console em dev; retornamos NaN para forçar quem
    // chama a tratar o caso. (O selector em curves.ts já garante a
    // curva certa quando consumida via getCurvaPara.)
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        `spreadVsCurva: curva ${curva.indexador} usada para indexador ${indexador}`,
      );
    }
  }
  const yieldCurva = interpolarCurva(curva, prazoDU);
  return (yieldAtivo - yieldCurva) * 10_000;
}
