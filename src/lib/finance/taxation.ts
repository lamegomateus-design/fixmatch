/**
 * Tributação de renda fixa brasileira.
 *
 * Tabelas:
 *   - IR regressivo (Lei 11.033/2004): aplicado sobre rendimentos.
 *       até 180 dias    → 22,5%
 *       181 a 360 dias  → 20,0%
 *       361 a 720 dias  → 17,5%
 *       acima de 720    → 15,0%
 *   - LCI / LCA / CRI / CRA / Debênture incentivada (Lei 12.431):
 *       Isentos para PF; PJ tributada como CDB.
 *
 * O IOF segue a tabela regressiva nos primeiros 30 dias (95% → 0%).
 * Como o MVP trabalha com prazos > 30 dias na esmagadora maioria dos
 * casos, modelamos o IOF como zero para prazos ≥ 30 dias e aplicamos
 * a tabela completa para prazos < 30.
 */

import type { AssetType, Perfil } from "@/types";

export interface AliquotaInput {
  tipoAtivo: AssetType;
  isIncentivada?: boolean;
  prazoDias: number;
  perfil: Perfil;
}

export interface AliquotaOutput {
  /** Alíquota de IR sobre rendimentos (decimal). 0 = isento. */
  ir: number;
  /** Alíquota efetiva de IOF (decimal). 0 = sem IOF (prazo ≥ 30d). */
  iof: number;
  /** True se o ativo é isento de IR para o perfil informado. */
  isento: boolean;
  /** Texto descritivo (UI). */
  descricao: string;
}

const IOF_REGRESSIVO: number[] = [
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36,
  33, 30, 26, 23, 20, 16, 13, 10, 6, 3, 0,
];

/**
 * Calcula a alíquota efetiva de IOF para resgates antes de 30 dias.
 * Retorna decimal (0,96 = 96%). Para prazos ≥ 30 dias, 0.
 */
export function aliquotaIOF(prazoDias: number): number {
  if (prazoDias >= 30) return 0;
  const idx = Math.max(0, Math.min(IOF_REGRESSIVO.length - 1, prazoDias - 1));
  return IOF_REGRESSIVO[idx] / 100;
}

/**
 * Retorna o par {IR, IOF, isento} aplicável.
 *
 *   PF + (LCI | LCA | CRI | CRA | Debênture incentivada) → isento.
 *   PJ → sempre tributado pela tabela regressiva, sem isenção.
 *   Tesouro / CDB / Debênture comum → tabela regressiva sempre.
 */
export function aliquotaIR(input: AliquotaInput): AliquotaOutput {
  const { tipoAtivo, isIncentivada, prazoDias, perfil } = input;

  const ehIsentoPF =
    perfil === "PF" &&
    (tipoAtivo === "LCI" ||
      tipoAtivo === "LCA" ||
      tipoAtivo === "CRI" ||
      tipoAtivo === "CRA" ||
      (tipoAtivo === "Debênture" && !!isIncentivada));

  if (ehIsentoPF) {
    return {
      ir: 0,
      iof: 0,
      isento: true,
      descricao:
        tipoAtivo === "Debênture"
          ? "Debênture incentivada · isenta PF (Lei 12.431)"
          : `${tipoAtivo} · isento PF`,
    };
  }

  // Tabela regressiva (CDB, Tesouro, Debênture comum, e tudo para PJ)
  let ir: number;
  let faixa: string;
  if (prazoDias <= 180) {
    ir = 0.225;
    faixa = "até 180d";
  } else if (prazoDias <= 360) {
    ir = 0.2;
    faixa = "181–360d";
  } else if (prazoDias <= 720) {
    ir = 0.175;
    faixa = "361–720d";
  } else {
    ir = 0.15;
    faixa = "720d+";
  }

  const iof = aliquotaIOF(prazoDias);
  const descricao = `IR regressivo ${(ir * 100).toFixed(1)}% (${faixa})${
    iof > 0 ? ` · IOF ${(iof * 100).toFixed(0)}%` : ""
  }`;

  return {
    ir,
    iof,
    isento: false,
    descricao,
  };
}

/**
 * Converte yield bruto anual em yield líquido anual aplicando
 * IR + IOF (quando aplicável). Para prazos curtos com IOF, o IOF
 * incide proporcionalmente sobre o rendimento e o resultado é então
 * deflacionado ao período anual.
 *
 *   Para prazos ≥ 30 dias (caso comum):
 *     yieldLiquido = yieldBruto × (1 - ir)
 *
 *   Para prazos < 30 dias (raro no MVP):
 *     rend_bruto_periodo  = (1 + yieldBruto)^(prazo / 252) - 1
 *     rend_liquido_periodo = rend_bruto_periodo × (1 - iof) × (1 - ir)
 *     yieldLiquido         = (1 + rend_liquido_periodo)^(252 / prazo) - 1
 *
 * @param yieldBrutoAnual Yield bruto anual (decimal, base 252).
 * @param tipoAtivo Tipo do ativo.
 * @param prazoDias Prazo em dias corridos até o vencimento/resgate.
 * @param perfil "PF" | "PJ".
 * @param isIncentivada True para debêntures Lei 12.431.
 */
export function calcularYieldLiquido(
  yieldBrutoAnual: number,
  tipoAtivo: AssetType,
  prazoDias: number,
  perfil: Perfil,
  isIncentivada = false,
): number {
  const { ir, iof, isento } = aliquotaIR({
    tipoAtivo,
    isIncentivada,
    prazoDias,
    perfil,
  });
  if (isento) return yieldBrutoAnual;

  if (prazoDias >= 30) {
    return yieldBrutoAnual * (1 - ir);
  }

  // caminho raro: prazo curto com IOF
  const t = Math.max(1, prazoDias) / 252;
  const rendBrutoPeriodo = Math.pow(1 + yieldBrutoAnual, t) - 1;
  const rendLiquidoPeriodo = rendBrutoPeriodo * (1 - iof) * (1 - ir);
  return Math.pow(1 + rendLiquidoPeriodo, 1 / t) - 1;
}
