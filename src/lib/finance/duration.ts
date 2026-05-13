/**
 * Duration de Macaulay, Duration Modificada e DV01.
 *
 * Convenções:
 *   - Fluxos de caixa em datas (Date) e valores em BRL (positivos).
 *   - Taxa anual em base 252 (decimal).
 *   - Tempos t_k são medidos em dias úteis / 252 (anos úteis).
 */

import type { FluxoCaixa } from "@/types";
import { DU_ANO } from "./constants";
import { diasUteis } from "./holidays";

/**
 * Duration de Macaulay (em anos úteis).
 *
 *   D_Mac = Σ (t_k × VP_k) / Σ VP_k
 *
 * onde VP_k = CF_k / (1 + i)^(t_k) e t_k = du_k / 252.
 *
 * Por convenção retornamos a duration ponderada pelo PU passado (se
 * fornecido), evitando recomputar Σ VP_k. Se `pu` for omitido, usa
 * o somatório implícito dos VPs.
 *
 * @param fluxos Lista de fluxos {data, valor}.
 * @param taxa Taxa anual de desconto (base 252, decimal).
 * @param hoje Data de referência (default = primeiro fluxo).
 * @param pu Preço unitário ancorado (opcional).
 */
export function calcularDurationMacaulay(
  fluxos: FluxoCaixa[],
  taxa: number,
  hoje: Date = new Date(),
  pu?: number,
): number {
  if (fluxos.length === 0) return 0;

  let somaVP = 0;
  let somaPondVP = 0;

  for (const cf of fluxos) {
    const du = diasUteis(hoje, cf.data);
    if (du <= 0) continue;
    const t = du / DU_ANO;
    const vp = cf.valor / Math.pow(1 + taxa, t);
    somaVP += vp;
    somaPondVP += t * vp;
  }

  const denom = pu && pu > 0 ? pu : somaVP;
  if (denom <= 0) return 0;
  return somaPondVP / denom;
}

/**
 * Duration Modificada (sensibilidade a 1 pp de yield).
 *
 *   D_Mod = D_Mac / (1 + i)
 *
 * @param durationMacaulay Duration de Macaulay em anos.
 * @param taxa Taxa anual de desconto (base 252, decimal).
 */
export function calcularDurationModificada(
  durationMacaulay: number,
  taxa: number,
): number {
  if (1 + taxa <= 0) return 0;
  return durationMacaulay / (1 + taxa);
}

/**
 * DV01 (Dollar Value of 1 basis point) — variação aproximada de preço
 * para um deslocamento paralelo de +1 bp na curva.
 *
 *   DV01 ≈ -PU × D_Mod × 0,0001
 *
 * Retornamos o valor absoluto (em BRL) — a UI escolhe o sinal a exibir.
 *
 * @param pu Preço unitário.
 * @param durationModificada Duration modificada em anos.
 */
export function calcularDV01(pu: number, durationModificada: number): number {
  return Math.abs(pu * durationModificada * 0.0001);
}

/**
 * Helper: monta o fluxo de caixa simplificado de um bullet (sem cupom),
 * com um único pagamento no vencimento igual a VN/VNA.
 */
export function fluxoBullet(vencimento: Date, valorResgate: number): FluxoCaixa[] {
  return [{ data: vencimento, valor: valorResgate }];
}

/**
 * Helper: monta o fluxo de caixa de um título com cupons periódicos
 * (semestral / anual) e principal no vencimento. Útil para debêntures
 * e NTN-Bs.
 *
 * @param emissao Data de emissão do título.
 * @param vencimento Data de vencimento.
 * @param valorPrincipal Valor de resgate no vencimento (VN ou VNA).
 * @param taxaCupomAnual Taxa anual de cupom (decimal).
 * @param frequencia "semestral" | "anual".
 */
export function fluxoComCupom(
  emissao: Date,
  vencimento: Date,
  valorPrincipal: number,
  taxaCupomAnual: number,
  frequencia: "semestral" | "anual",
): FluxoCaixa[] {
  const periodosPorAno = frequencia === "semestral" ? 2 : 1;
  const cupom =
    valorPrincipal *
    (Math.pow(1 + taxaCupomAnual, 1 / periodosPorAno) - 1);

  const fluxos: FluxoCaixa[] = [];
  const passos = periodosPorAno === 2 ? 6 : 12; // meses entre cupons
  const cur = new Date(emissao);
  cur.setUTCMonth(cur.getUTCMonth() + passos);

  while (cur.getTime() < vencimento.getTime()) {
    fluxos.push({ data: new Date(cur), valor: cupom });
    cur.setUTCMonth(cur.getUTCMonth() + passos);
  }
  // último cupom + principal no vencimento
  fluxos.push({ data: new Date(vencimento), valor: cupom + valorPrincipal });
  return fluxos;
}
