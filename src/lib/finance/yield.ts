/**
 * Yield implícito por indexador. Inverso das funções de PU.
 *
 * Convenção: base 252 du, taxas decimais.
 */

import { DU_ANO } from "./constants";

/**
 * Yield implícito de um título pré-fixado, dado o PU.
 *
 *   i = (VN / PU)^(252 / du) - 1
 *
 * @param pu Preço unitário negociado.
 * @param vn Valor nominal de resgate.
 * @param du Dias úteis até o vencimento.
 */
export function calcularYieldImplicito_PreFixado(
  pu: number,
  vn: number,
  du: number,
): number {
  if (du <= 0 || pu <= 0) return 0;
  return Math.pow(vn / pu, DU_ANO / du) - 1;
}

/**
 * Yield implícito de um título %CDI, dado o PU.
 *
 * Inverte `calcularPU_CDI`. Retorna tanto a taxa equivalente anual quanto
 * o percentual de CDI implícito (relativo ao CDI projetado).
 *
 *   taxa_equiv = (VN / PU)^(252 / du) - 1
 *   percentCDI = taxa_equiv / CDI_proj × 100
 */
export function calcularYieldImplicito_CDI(
  pu: number,
  vn: number,
  du: number,
  cdiProjetadoAnual: number,
): { percentCDI: number; taxaEquivAnual: number } {
  if (du <= 0 || pu <= 0 || cdiProjetadoAnual <= 0) {
    return { percentCDI: 0, taxaEquivAnual: 0 };
  }
  const taxaEquivAnual = Math.pow(vn / pu, DU_ANO / du) - 1;
  const percentCDI = (taxaEquivAnual / cdiProjetadoAnual) * 100;
  return { percentCDI, taxaEquivAnual };
}

/**
 * Cupom real implícito de um título IPCA+, dado o PU e o VNA atual.
 *
 *   r = (VNA / PU)^(252 / du) - 1
 *
 * @param pu Preço unitário negociado.
 * @param vna Valor nominal atualizado.
 * @param du Dias úteis até o vencimento.
 */
export function calcularYieldImplicito_IPCA(
  pu: number,
  vna: number,
  du: number,
): number {
  if (du <= 0 || pu <= 0) return 0;
  return Math.pow(vna / pu, DU_ANO / du) - 1;
}
