import type { ExecutedRatePoint, HistoricalRatePoint, Trade } from "@/types";

export const recentTrades: Trade[] = [
  {
    id: "tr-501",
    offerId: "of-018",
    assetTicker: "LCI-BMG-27",
    assetType: "LCI",
    executedPU: 932.0,
    executedRate: 0.1278,
    volume: 932000 * 0.3,
    executedAt: "2026-05-09T17:42:00Z",
    counterparties: { buyer: "Buyer-1188", seller: "Seller-3399" },
    status: "Liquidada",
  },
  {
    id: "tr-502",
    offerId: "of-101",
    assetTicker: "DEB-VALE32",
    assetType: "Debênture",
    executedPU: 1009.4,
    executedRate: 0.0719,
    volume: 504_700,
    executedAt: "2026-05-10T11:15:00Z",
    counterparties: { buyer: "Buyer-2031", seller: "Seller-7780" },
    status: "Liquidando",
  },
  {
    id: "tr-503",
    offerId: "of-102",
    assetTicker: "CDB-GNL-26",
    assetType: "CDB",
    executedPU: 932.8,
    executedRate: 0.1389,
    volume: 233_200,
    executedAt: "2026-05-10T15:01:00Z",
    counterparties: { buyer: "Buyer-4101", seller: "Seller-7732" },
    status: "Liquidada",
  },
  {
    id: "tr-504",
    offerId: "of-103",
    assetTicker: "CRI-KLBN26",
    assetType: "CRI",
    executedPU: 984.0,
    executedRate: 0.0875,
    volume: 196_800,
    executedAt: "2026-05-10T16:32:00Z",
    counterparties: { buyer: "Buyer-9920", seller: "Seller-8821" },
    status: "Liquidada",
  },
  {
    id: "tr-505",
    offerId: "of-104",
    assetTicker: "NTN-B-2035",
    assetType: "Tesouro",
    executedPU: 3781.2,
    executedRate: 0.0641,
    volume: 113_436,
    executedAt: "2026-05-10T17:48:00Z",
    counterparties: { buyer: "Buyer-6611", seller: "Seller-1010" },
    status: "Liquidando",
  },
  {
    id: "tr-506",
    offerId: "of-105",
    assetTicker: "LTN-2027",
    assetType: "Tesouro",
    executedPU: 792.1,
    executedRate: 0.1175,
    volume: 396_050,
    executedAt: "2026-05-10T18:55:00Z",
    counterparties: { buyer: "Buyer-1042", seller: "Seller-3030" },
    status: "Pendente",
  },
];

export function buildHistoricalRateTunnel(
  baseRate: number,
  days = 90,
): HistoricalRatePoint[] {
  const series: HistoricalRatePoint[] = [];
  const today = new Date("2026-05-10T00:00:00Z");
  for (let i = days; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const drift = Math.sin(i / 12) * 0.0035;
    const noise = ((Math.random() - 0.5) * 2) * 0.0015;
    const mid = baseRate + drift + noise;
    series.push({
      date: d.toISOString().slice(0, 10),
      rate: mid,
      low: mid - 0.0045,
      high: mid + 0.0045,
    });
  }
  return series;
}

export function buildExecutedRateSeries(
  baseRate: number,
  count = 18,
): ExecutedRatePoint[] {
  const series: ExecutedRatePoint[] = [];
  const today = new Date("2026-05-10T00:00:00Z");
  for (let i = count; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 2);
    const noise = ((Math.random() - 0.5) * 2) * 0.002;
    series.push({
      date: d.toISOString().slice(0, 10),
      rate: baseRate + noise,
      volume: 50_000 + Math.round(Math.random() * 350_000),
    });
  }
  return series;
}
