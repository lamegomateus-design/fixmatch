import type {
  BuyerSimulationInput,
  BuyerSimulationOutput,
  Offer,
} from "@/types";

export const CDI_ANNUAL = 0.1115;
export const BUSINESS_DAYS_YEAR = 252;
export const CALENDAR_DAYS_YEAR = 365;

export function daysBetween(start: Date | string, end: Date | string): number {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000));
}

export function businessDaysBetween(
  start: Date | string,
  end: Date | string,
): number {
  const totalDays = daysBetween(start, end);
  return Math.round((totalDays / CALENDAR_DAYS_YEAR) * BUSINESS_DAYS_YEAR);
}

export function computeImpliedYield(
  purchasePU: number,
  faceValue: number,
  maturity: string | Date,
  from: Date | string = new Date(),
): number {
  const du = Math.max(1, businessDaysBetween(from, maturity));
  const ratio = faceValue / purchasePU;
  return Math.pow(ratio, BUSINESS_DAYS_YEAR / du) - 1;
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

export function netReturnAfterTax(
  grossReturn: number,
  taxBracket: number,
): number {
  return grossReturn * (1 - taxBracket);
}

export function ratioVsCDI(rate: number, cdi: number = CDI_ANNUAL): number {
  if (!cdi) return 0;
  return rate / cdi;
}

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

export function runBuyerSimulation(
  input: BuyerSimulationInput,
): BuyerSimulationOutput {
  const today = new Date();
  const days = daysBetween(today, input.maturity);
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
    Math.pow(1 + CDI_ANNUAL, businessDaysBetween(today, input.maturity) / BUSINESS_DAYS_YEAR);

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

/**
 * Match score 0–100. Buyer profile (preferred type, max maturity, min yield)
 * compared to the offer. Highlights how attractive the offer is relative
 * to the buyer's target.
 */
export interface MatchProfile {
  assetType?: string;
  maxMaturity?: string;
  minYield?: number;
  maxPU?: number;
  preferredRating?: string[];
}

export function computeMatchScore(
  offer: Offer,
  profile: MatchProfile = {
    minYield: 0.13,
    preferredRating: ["AAA", "AA+", "AA", "AA-", "A+"],
  },
): number {
  let score = 50;

  // Yield component (up to +30)
  if (profile.minYield) {
    const delta = offer.offeredRate - profile.minYield;
    score += Math.max(-20, Math.min(30, delta * 600));
  }

  // Deságio component (up to +15)
  if (offer.agioDeagioPct < 0) {
    score += Math.min(15, Math.abs(offer.agioDeagioPct) * 200);
  } else {
    score -= Math.min(10, offer.agioDeagioPct * 200);
  }

  // Rating component (up to +10)
  if (
    profile.preferredRating &&
    profile.preferredRating.includes(offer.asset.issuer.rating)
  ) {
    score += 10;
  } else {
    score -= 5;
  }

  // Asset type match
  if (profile.assetType && profile.assetType === offer.asset.type) {
    score += 8;
  }

  // Maturity preference
  if (profile.maxMaturity) {
    const maxDate = new Date(profile.maxMaturity).getTime();
    const matDate = new Date(offer.asset.maturity).getTime();
    if (matDate <= maxDate) score += 5;
    else score -= 5;
  }

  // Urgency: high urgency → small bonus (better deal opportunity)
  if (offer.urgency === "Alta") score += 4;
  else if (offer.urgency === "Média") score += 1;

  return Math.max(0, Math.min(100, Math.round(score)));
}

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
