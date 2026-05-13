/**
 * Legacy shim. Mantém os símbolos antigos do `lib/finance` para que a
 * UI continue compilando enquanto migramos os consumers para o novo
 * engine modular em `lib/finance/*`. Quando todos migrarem, remover
 * este arquivo.
 *
 * Mudanças relevantes:
 *   - CDI_ANNUAL agora bate com CDI_ANUAL = 14,40% a.a. (single source).
 *   - businessDaysBetween agora conta dias úteis reais via feriados ANBIMA.
 *   - computeImpliedYield delega para `calcularYieldImplicito_PreFixado`
 *     (mantém a fórmula original — pré base 252 — para PU/face genéricos).
 *   - computeMatchScore mantém o contrato `(offer) => number` usando o
 *     novo motor com demanda neutra.
 */

import type { BuyerSimulationInput, BuyerSimulationOutput, Offer } from "@/types";
import {
  CDI_ANUAL,
  DU_ANO,
  DC_ANO,
  diasUteis,
  diasCorridos,
  calcularYieldImplicito_PreFixado,
  calcularMatchScore,
} from "./finance/index";

export {
  // Re-exporta o engine novo (estimula migração progressiva)
  CDI_ANUAL,
  DU_ANO,
  DC_ANO,
  diasUteis,
  diasCorridos,
} from "./finance/index";

// ── Constantes legadas ──────────────────────────────────────────────
/** @deprecated use CDI_ANUAL */
export const CDI_ANNUAL = CDI_ANUAL;
/** @deprecated use DU_ANO */
export const BUSINESS_DAYS_YEAR = DU_ANO;
/** @deprecated use DC_ANO */
export const CALENDAR_DAYS_YEAR = DC_ANO;

// ── Datas ───────────────────────────────────────────────────────────
/** @deprecated use diasCorridos */
export function daysBetween(start: Date | string, end: Date | string): number {
  return diasCorridos(start, end);
}

/** @deprecated use diasUteis (agora considera feriados ANBIMA). */
export function businessDaysBetween(
  start: Date | string,
  end: Date | string,
): number {
  return diasUteis(start, end);
}

// ── Cálculo financeiro legado ───────────────────────────────────────
/** @deprecated use calcularYieldImplicito_PreFixado/_CDI/_IPCA conforme o indexador. */
export function computeImpliedYield(
  purchasePU: number,
  faceValue: number,
  maturity: string | Date,
  from: Date | string = new Date(),
): number {
  const du = Math.max(1, diasUteis(from, maturity));
  return calcularYieldImplicito_PreFixado(purchasePU, faceValue, du);
}

export function computeAgioDeagio(
  currentPU: number,
  offeredPU: number,
): number {
  if (!currentPU) return 0;
  return (offeredPU - currentPU) / currentPU;
}

export function computeDiscountPct(
  faceValue: number,
  offeredPU: number,
): number {
  if (!faceValue) return 0;
  return (faceValue - offeredPU) / faceValue;
}

/** @deprecated use calcularYieldLiquido com tipo de ativo + perfil. */
export function netReturnAfterTax(
  grossReturn: number,
  taxBracket: number,
): number {
  return grossReturn * (1 - taxBracket);
}

export function ratioVsCDI(rate: number, cdi: number = CDI_ANUAL): number {
  if (!cdi) return 0;
  return rate / cdi;
}

// ── Formatadores ────────────────────────────────────────────────────
export function formatPercent(value: number, fractionDigits = 2): string {
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function formatCurrency(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatDateBR(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTimeBR(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// ── Buyer simulation legacy ─────────────────────────────────────────
/**
 * @deprecated A nova implementação do simulador vive em
 * `components/simulator/simulator.tsx` e usa direto o engine modular.
 * Mantemos para compatibilidade com chamadas existentes.
 */
export function runBuyerSimulation(
  input: BuyerSimulationInput,
): BuyerSimulationOutput {
  const today = new Date();
  const days = diasCorridos(today, input.maturity);
  const annualizedYield = computeImpliedYield(
    input.purchasePU,
    input.faceValue,
    input.maturity,
    today,
  );
  const grossReturn = input.faceValue - input.purchasePU;
  const netReturn = netReturnAfterTax(grossReturn, input.taxBracket);
  const vsCDI = ratioVsCDI(annualizedYield);
  const breakEvenPrice =
    input.faceValue /
    Math.pow(1 + CDI_ANUAL, diasUteis(today, input.maturity) / DU_ANO);
  return {
    grossReturn,
    netReturn,
    annualizedYield,
    estimatedProfit: netReturn,
    daysToMaturity: days,
    vsCDI,
    breakEvenPrice,
  };
}

// ── Match score legacy ──────────────────────────────────────────────
export interface MatchProfile {
  assetType?: string;
  maxMaturity?: string;
  minYield?: number;
  maxPU?: number;
  preferredRating?: string[];
}

/**
 * @deprecated use calcularMatchScore(offer, demanda) — assinatura nova
 * com componentes ponderados (40/25/20/10/5). Esta versão delega ao
 * motor novo com demanda neutra para preservar o livro atual.
 */
export function computeMatchScore(offer: Offer, _profile?: MatchProfile): number {
  // Demanda neutra; UI antiga não tem demanda concreta no contexto.
  return calcularMatchScore(offer, {});
}

// ── UI helpers (sem dependência financeira) ─────────────────────────
export function urgencyColor(urgency: Offer["urgency"]): string {
  switch (urgency) {
    case "Alta":
      return "text-destructive";
    case "Média":
      return "text-warning";
    default:
      return "text-muted-foreground";
  }
}

export function statusColor(status: Offer["status"]): string {
  switch (status) {
    case "Disponível":
      return "text-positive";
    case "Em negociação":
      return "text-info";
    case "Executada":
      return "text-muted-foreground";
    case "Cancelada":
      return "text-destructive";
    case "Pendente":
      return "text-warning";
  }
}
