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

export type IndexerType = "Pré" | "CDI" | "IPCA+" | "Selic";

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
