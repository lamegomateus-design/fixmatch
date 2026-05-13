/**
 * Comparação contra CDI.
 *
 * `%CDI` é a forma de expressar quanto a operação rendeu em relação ao
 * CDI vigente. Convencionamos comparar yields anuais.
 *
 *   percentCDI = yield / CDI × 100
 *   spreadBps  = (yield - CDI) × 10.000
 */

export interface ComparacaoCDI {
  percentCDI: number;
  spreadBps: number;
}

export function comparacaoVsCDI(
  yieldAnual: number,
  cdiAnual: number,
): ComparacaoCDI {
  if (cdiAnual <= 0) return { percentCDI: 0, spreadBps: 0 };
  return {
    percentCDI: (yieldAnual / cdiAnual) * 100,
    spreadBps: (yieldAnual - cdiAnual) * 10_000,
  };
}
