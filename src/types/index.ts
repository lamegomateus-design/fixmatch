export type AssetType =
  | "CDB"
  | "LCI"
  | "LCA"
  | "Debênture"
  | "CRI"
  | "CRA"
  | "Tesouro";

export type RatingTier =
  | "AAA"
  | "AA+"
  | "AA"
  | "AA-"
  | "A+"
  | "A"
  | "A-"
  | "BBB+"
  | "BBB"
  | "BBB-"
  | "BB"
  | "B";

export type Urgency = "Baixa" | "Média" | "Alta";

export type OfferStatus =
  | "Disponível"
  | "Em negociação"
  | "Executada"
  | "Cancelada"
  | "Pendente";

/**
 * Legacy label used in UI components. The canonical code used by the
 * finance engine is `Indexador` (below). "Selic" is rendered in the UI
 * for Tesouro Selic / LFT but treated as %CDI = 100% by the math layer.
 */
export type IndexerType = "Pré" | "CDI" | "IPCA+" | "Selic";

/** Canonical code consumed by the finance engine. */
export type Indexador = "PRE" | "CDI" | "IPCA";

export type Perfil = "PF" | "PJ";

export type FonteCurva = "DI_B3" | "ANBIMA";

export interface Issuer {
  id: string;
  name: string;
  cnpj: string;
  sector: string;
  rating: RatingTier;
}

export interface Asset {
  id: string;
  ticker: string;
  type: AssetType;
  issuer: Issuer;
  issueDate: string;
  maturity: string;
  faceValue: number;
  currentPU: number;
  originalRate: number;
  indexer: IndexerType;
  couponFreq?: "mensal" | "semestral" | "anual" | "no vencimento";
  isin?: string;
  // ── New canonical / derived fields (additive) ─────────────────────
  /** Canonical indexador code. UI keeps reading `indexer`. */
  indexerCode?: Indexador;
  /** True for Lei 12.431 incentivada debêntures (IR isento PF). */
  isIncentivada?: boolean;
  /** For %CDI assets, the percent of CDI (e.g. 115 means 115% CDI). */
  percentCDI?: number;
  /** For IPCA+ assets, the real coupon (decimal, e.g. 0.065 = 6.5% real). */
  cupomReal?: number;
  /** VNA atualizado pela inflação acumulada (apenas IPCA+). */
  vna?: number;
  /** Fair / theoretical PU from active curve + credit spread. */
  puJusto?: number;
  /** Credit spread over reference curve, in bps. */
  spreadCreditoBps?: number;
  /** Macaulay duration in years. */
  duration?: number;
  /** Modified duration in years. */
  durationModificada?: number;
  /** DV01 in BRL — price change for 1bp yield shift. */
  dv01?: number;
}

export interface Offer {
  id: string;
  asset: Asset;
  sellerId: string;
  sellerType: "PJ" | "PF" | "Family Office" | "Asset Manager";
  offeredPU: number;
  offeredRate: number;
  quantity: number;
  volume: number;
  agioDeagioPct: number;
  urgency: Urgency;
  status: OfferStatus;
  createdAt: string;
  expiresAt: string;
  matchScore: number;
  reasonForSale?: string;
  notes?: string;
  // ── New canonical / derived fields (additive) ─────────────────────
  /** Annualized gross yield implied by offeredPU (base 252). */
  yieldBrutoAnual?: number;
  /** Annualized net yield after IR (and IOF where applicable). */
  yieldLiquidoAnual?: number;
  /** Net yield expressed as % of CDI (PJ uses gross-equivalent). */
  percentCDILiquido?: number;
  /** Spread of offered yield vs active reference curve, in bps. */
  spreadVsCurvaBps?: number;
  /** Ágio (positive) / Deságio (negative) vs puJusto, in bps. */
  agioDeagioBps?: number;
}

export interface Trade {
  id: string;
  offerId: string;
  assetTicker: string;
  assetType: AssetType;
  executedPU: number;
  executedRate: number;
  volume: number;
  executedAt: string;
  counterparties: { buyer: string; seller: string };
  status: "Liquidada" | "Liquidando" | "Pendente";
}

export interface HistoricalRatePoint {
  date: string;
  rate: number;
  low: number;
  high: number;
}

export interface ExecutedRatePoint {
  date: string;
  rate: number;
  volume: number;
}

export interface AdminOperationItem {
  id: string;
  type:
    | "Oferta pendente"
    | "Oferta aprovada"
    | "Trade matchado"
    | "Liquidação"
    | "Custódia"
    | "KYC";
  asset: string;
  party: string;
  amount: number;
  status:
    | "Em análise"
    | "Aprovado"
    | "Rejeitado"
    | "Aguardando"
    | "Concluído"
    | "Bloqueado";
  updatedAt: string;
  severity?: "info" | "warning" | "critical";
}

export interface BuyerSimulationInput {
  purchasePU: number;
  faceValue: number;
  maturity: string;
  rate: number;
  indexer: IndexerType;
  taxBracket: number;
  desiredReturn?: number;
}

export interface BuyerSimulationOutput {
  grossReturn: number;
  netReturn: number;
  annualizedYield: number;
  estimatedProfit: number;
  daysToMaturity: number;
  vsCDI: number;
  breakEvenPrice: number;
}

// ── Finance engine types ────────────────────────────────────────────

export interface FluxoCaixa {
  data: Date;
  valor: number;
}

export interface Vertice {
  duDias: number;
  taxa: number;
}

export interface CurvaReferencia {
  fonte: FonteCurva;
  indexador: Indexador;
  vertices: Vertice[];
  dataReferencia: Date;
}

export interface Demanda {
  tipoAtivo?: AssetType;
  ratingMinimo?: RatingTier;
  taxaDesejada?: number;
  durationDesejado?: number;
  volumeBuscado?: number;
}

export interface MatchScoreBreakdown {
  total: number;
  componentes: {
    taxa: number;
    duration: number;
    volume: number;
    rating: number;
    urgencia: number;
  };
}
