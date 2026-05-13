/**
 * Cálculo de Preço Unitário (PU) por indexador.
 *
 * Convenções:
 *   - du = dias úteis até o vencimento (ANBIMA, base 252).
 *   - Taxas anuais expressas em decimal (0,14 = 14%).
 *   - Para %CDI usamos a curva DI projetada (vetor de fatores diários
 *     ou taxa equivalente anual) para descapitalizar o VN.
 */

import { DU_ANO } from "./constants";

/**
 * PU de um título pré-fixado.
 *
 *   PU = VN / (1 + i)^(du / 252)
 *
 * @param vn Valor nominal de resgate (no vencimento).
 * @param taxa Taxa nominal anual em base 252 (decimal).
 * @param du Dias úteis até o vencimento.
 */
export function calcularPU_PreFixado(
  vn: number,
  taxa: number,
  du: number,
): number {
  if (du <= 0) return vn;
  return vn / Math.pow(1 + taxa, du / DU_ANO);
}

/**
 * PU de um título %CDI (pós-fixado).
 *
 * Modelo MtM simplificado: usa a taxa CDI projetada da curva DI no
 * vértice do vencimento para descapitalizar o VN. O fator efetivo
 * anual de remuneração contratada é
 *
 *   fator_anual_contratado = (1 + CDI_proj)^(p) ≈ 1 + p · CDI_proj
 *
 * onde p = percentCDI / 100. Para coerência com a prática de mesa
 * usamos a forma multiplicativa simples: taxa equivalente anual =
 * CDI_proj × p. O PU é então
 *
 *   PU = VN / (1 + taxa_equiv)^(du / 252)
 *
 * @param vn Valor nominal de resgate (no vencimento).
 * @param percentCDI Percentual de CDI contratado (ex.: 115).
 * @param du Dias úteis até o vencimento.
 * @param cdiProjetadoAnual Taxa CDI anual projetada (decimal) para o prazo.
 */
export function calcularPU_CDI(
  vn: number,
  percentCDI: number,
  du: number,
  cdiProjetadoAnual: number,
): number {
  if (du <= 0) return vn;
  const taxaEquivAnual = cdiProjetadoAnual * (percentCDI / 100);
  return vn / Math.pow(1 + taxaEquivAnual, du / DU_ANO);
}

/**
 * PU de um título IPCA+ (juro real).
 *
 *   PU = VNA / (1 + cupom_real)^(du / 252)
 *
 * VNA = valor nominal atualizado (VN × IPCA acumulado desde a emissão).
 *
 * Observação: a parte da inflação acumulada é capturada no próprio VNA
 * (passado como input). Aqui descontamos apenas o juro real.
 *
 * @param vna Valor nominal atualizado pela inflação.
 * @param cupomReal Cupom real anual em base 252 (decimal).
 * @param du Dias úteis até o vencimento.
 */
export function calcularPU_IPCA(
  vna: number,
  cupomReal: number,
  du: number,
): number {
  if (du <= 0) return vna;
  return vna / Math.pow(1 + cupomReal, du / DU_ANO);
}

/**
 * Atualiza o VNA de um título indexado ao IPCA da data de emissão até
 * a data de referência, dado um IPCA anualizado projetado.
 *
 *   VNA(t) = VNA_base × (1 + IPCA_anual)^(dc / 365)
 *
 * Convenção: a indexação ao IPCA usa dias corridos (base 360/365),
 * apenas a parte do juro real real opera em 252 (ver `calcularPU_IPCA`).
 */
export function atualizarVNA(
  vnaBase: number,
  ipcaAnual: number,
  dcDesdeEmissao: number,
  dcAno = 365,
): number {
  if (dcDesdeEmissao <= 0) return vnaBase;
  return vnaBase * Math.pow(1 + ipcaAnual, dcDesdeEmissao / dcAno);
}
