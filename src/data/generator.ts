/**
 * Gerador determinístico de 150 ativos coerentes + 150 ofertas para o
 * FIXMATCH. Coerência: para cada ativo,
 *
 *   1. yield_justo  = taxa_curva(prazo) + spread_credito(rating)
 *   2. PU_justo     = descapitalização do VN/VNA pelo yield_justo no indexador
 *   3. PU_ofertado  = PU_justo × (1 + delta), delta ∈ [-3,0%, +1,5%]
 *   4. yield_ofertado = yield implícito recalculado a partir do PU_ofertado
 *   5. agio_bps     = (yield_ofertado - yield_justo) × 10.000
 *   6. yield_liq    = aplicação de IR/IOF conforme tipo + perfil
 *   7. duration/DV01 via fluxos de caixa
 *
 * O motor financeiro é o mesmo consumido pela UI (`@/lib/finance`).
 */

import type {
  Asset,
  AssetType,
  Indexador,
  IndexerType,
  Offer,
  Perfil,
  RatingTier,
  Urgency,
} from "@/types";
import { createRng, type SeededRng } from "@/lib/rng";
import {
  IPCA_ANUAL,
  VNA_BASE,
} from "@/lib/finance/constants";
import {
  addBusinessDays,
  diasCorridos,
  diasUteis,
} from "@/lib/finance/holidays";
import {
  calcularPU_PreFixado,
  calcularPU_CDI,
  calcularPU_IPCA,
  atualizarVNA,
} from "@/lib/finance/pu";
import {
  calcularYieldImplicito_PreFixado,
  calcularYieldImplicito_CDI,
  calcularYieldImplicito_IPCA,
} from "@/lib/finance/yield";
import {
  calcularDurationMacaulay,
  calcularDurationModificada,
  calcularDV01,
  fluxoBullet,
  fluxoComCupom,
} from "@/lib/finance/duration";
import { calcularYieldLiquido } from "@/lib/finance/taxation";
import { comparacaoVsCDI } from "@/lib/finance/cdi";
import { calcularMatchScore } from "@/lib/finance/match";
import {
  CURVA_DI_B3,
  cdiProjetadoPara,
  interpolarCurva,
  CURVA_ANBIMA_IPCA,
} from "@/lib/finance/curves";
import {
  banks,
  corporatesComuns,
  corporatesIncentivadas,
  governo,
  securitizadoras,
  type IssuerWithMeta,
} from "./issuers";

// ── Configuração ────────────────────────────────────────────────────

export const GENERATOR_SEED = 42;
export const HOJE = new Date("2026-05-11T00:00:00Z");

/** Distribuição alvo por tipo de ativo (soma = 1). */
const DIST_TIPO: Record<AssetType, number> = {
  CDB: 0.3,
  LCI: 0.15,
  LCA: 0.1,
  Debênture: 0.25,
  CRI: 0.1,
  CRA: 0.05,
  Tesouro: 0.05,
};

/** Distribuição alvo por indexador. */
const DIST_INDEXADOR: Record<Indexador, number> = {
  PRE: 0.35,
  CDI: 0.35,
  IPCA: 0.3,
};

/** Spread de crédito por rating (faixa em bps sobre a curva). */
const SPREAD_BPS: Record<RatingTier, [number, number]> = {
  AAA: [30, 70],
  "AA+": [70, 110],
  AA: [110, 160],
  "AA-": [160, 210],
  "A+": [210, 280],
  A: [280, 360],
  "A-": [360, 450],
  "BBB+": [450, 600],
  BBB: [600, 750],
  "BBB-": [750, 900],
  BB: [900, 1100],
  B: [1100, 1400],
};

/** Tesouro: emissor unico → universo fixo de subtipos. */
const TESOURO_SUBTYPES = [
  { ticker: "LTN", indexer: "PRE" as Indexador },
  { ticker: "NTN-B", indexer: "IPCA" as Indexador },
  { ticker: "LFT", indexer: "CDI" as Indexador }, // Tesouro Selic ≈ %CDI 100%
];

const SELLER_TYPES: Offer["sellerType"][] = [
  "PJ",
  "PF",
  "Family Office",
  "Asset Manager",
];

const URGENCIES: Urgency[] = ["Baixa", "Média", "Alta"];

/** Mapa Indexador canônico → label legado para a UI. */
function indexerLabel(code: Indexador): IndexerType {
  if (code === "PRE") return "Pré";
  if (code === "IPCA") return "IPCA+";
  return "CDI";
}

/** Universo de emissores válidos para um dado tipo de ativo. */
function poolEmissores(tipo: AssetType): IssuerWithMeta[] {
  switch (tipo) {
    case "CDB":
    case "LCI":
    case "LCA":
      return banks;
    case "Debênture":
      return [...corporatesComuns, ...corporatesIncentivadas];
    case "CRI":
    case "CRA":
      return securitizadoras;
    case "Tesouro":
      return governo;
  }
}

/**
 * Para CRI/CRA, exibimos "Securitizadora — Devedor". O devedor é
 * sorteado entre corporates compatíveis com o lastro (imobiliário ou
 * agro). Para o MVP, simplificamos: CRI → empresa imobiliária ou
 * energia; CRA → empresa do agro.
 */
const DEVEDORES_CRI = [
  "Cyrela",
  "Eztec",
  "Direcional",
  "Helbor",
  "MRV",
  "Plano&Plano",
];
const DEVEDORES_CRA = [
  "JBS",
  "BRF",
  "Marfrig",
  "Minerva",
  "São Martinho",
  "SLC Agrícola",
  "3tentos",
];

/**
 * Universo de indexadores válidos para cada tipo de ativo.
 * LCI/LCA tipicamente pós-fixadas (%CDI) ou pré.
 * CRI/CRA: em geral IPCA+ ou pré.
 * Debênture incentivada: por construção é IPCA+ (Lei 12.431).
 */
function poolIndexadores(tipo: AssetType, isIncentivada = false): Indexador[] {
  if (isIncentivada) return ["IPCA"];
  switch (tipo) {
    case "LCI":
    case "LCA":
      return ["CDI", "PRE"];
    case "CRI":
    case "CRA":
      return ["IPCA", "PRE"];
    case "Debênture":
      return ["IPCA", "PRE", "CDI"];
    case "Tesouro":
      return ["PRE", "IPCA", "CDI"];
    case "CDB":
      return ["PRE", "CDI"];
  }
}

// ── Distribuição ponderada ──────────────────────────────────────────

function weightedPick<K extends string>(
  rng: SeededRng,
  dist: Record<K, number>,
): K {
  const r = rng.next();
  let acc = 0;
  for (const k in dist) {
    acc += dist[k];
    if (r <= acc) return k as K;
  }
  // fallback: última chave
  return Object.keys(dist)[Object.keys(dist).length - 1] as K;
}

// ── Dates ───────────────────────────────────────────────────────────

function randomMaturity(rng: SeededRng): Date {
  // 6 meses a 10 anos a partir de hoje
  const minDays = 180;
  const maxDays = 365 * 10;
  const d = new Date(HOJE);
  d.setUTCDate(d.getUTCDate() + rng.int(minDays, maxDays));
  return d;
}

function randomIssueDate(rng: SeededRng): Date {
  // entre 2022-01 e hoje
  const start = new Date("2022-01-15T00:00:00Z").getTime();
  const end = HOJE.getTime() - 86_400_000 * 30; // pelo menos 30 dias atrás
  return new Date(rng.range(start, end));
}

// ── Helpers de coerência ────────────────────────────────────────────

interface AssetPricing {
  yieldJustoAnual: number;     // taxa "fair" (curva + spread)
  spreadCreditoBps: number;
  puJusto: number;             // PU derivado do yieldJustoAnual
  vna?: number;                // apenas IPCA
  duration: number;            // Macaulay anos
  durationMod: number;
  dv01: number;
  fluxos: { data: Date; valor: number }[];
}

/**
 * Calcula o pricing teórico de um ativo recém-criado, dado tipo,
 * indexador, emissor, datas e características.
 */
function pricingFor({
  tipo,
  indexador,
  rating,
  issueDate,
  maturity,
  vn,
  cupomReal,
  percentCDI,
  taxaPre,
  rng,
}: {
  tipo: AssetType;
  indexador: Indexador;
  rating: RatingTier;
  issueDate: Date;
  maturity: Date;
  vn: number;
  cupomReal?: number;
  percentCDI?: number;
  taxaPre?: number;
  rng: SeededRng;
}): AssetPricing {
  const du = Math.max(1, diasUteis(HOJE, maturity));

  // 1. Taxa da curva no vértice
  const taxaCurva =
    indexador === "IPCA"
      ? interpolarCurva(CURVA_ANBIMA_IPCA, du)
      : interpolarCurva(CURVA_DI_B3, du);

  // 2. Spread de crédito
  const [spLow, spHigh] = SPREAD_BPS[rating];
  const spreadBps =
    indexador === "IPCA"
      ? Math.round(rng.range(spLow * 0.5, spHigh * 0.5)) // em juro real spread costuma metade
      : Math.round(rng.range(spLow, spHigh));

  const yieldJustoAnual = taxaCurva + spreadBps / 10_000;

  // 3. PU justo + fluxos
  let puJusto: number;
  let vna: number | undefined;
  let fluxos: { data: Date; valor: number }[];

  if (indexador === "IPCA") {
    const dcDesdeEmissao = diasCorridos(issueDate, HOJE);
    vna = atualizarVNA(VNA_BASE, IPCA_ANUAL, dcDesdeEmissao);
    const r = cupomReal ?? yieldJustoAnual; // se não passado, usa o próprio
    puJusto = calcularPU_IPCA(vna, r, du);
    // Fluxos: cupom semestral em juro real ≈ 0.5 × cupomAnual × VNA (aprox.)
    fluxos = fluxoComCupom(issueDate, maturity, vna, r, "semestral");
  } else if (indexador === "CDI") {
    const cdiProj = cdiProjetadoPara(du);
    const pCDI = percentCDI ?? 100;
    puJusto = calcularPU_CDI(vn, pCDI, du, cdiProj);
    fluxos = fluxoBullet(maturity, vn);
  } else {
    // PRE
    const i = taxaPre ?? yieldJustoAnual;
    puJusto = calcularPU_PreFixado(vn, i, du);
    // Maioria dos CDB/LCI/LCA são bullets; debêntures pré têm cupom
    fluxos =
      tipo === "Debênture"
        ? fluxoComCupom(issueDate, maturity, vn, i, "semestral")
        : fluxoBullet(maturity, vn);
  }

  // 4. Duration / DV01 (em base 252)
  const taxaParaDuration = yieldJustoAnual;
  const duration = calcularDurationMacaulay(
    fluxos,
    taxaParaDuration,
    HOJE,
    puJusto,
  );
  const durationMod = calcularDurationModificada(duration, taxaParaDuration);
  const dv01 = calcularDV01(puJusto, durationMod);

  return {
    yieldJustoAnual,
    spreadCreditoBps: spreadBps,
    puJusto,
    vna,
    duration,
    durationMod,
    dv01,
    fluxos,
  };
}

// ── Tickers ─────────────────────────────────────────────────────────

function tickerFor(
  tipo: AssetType,
  issuer: IssuerWithMeta,
  maturity: Date,
  index: number,
): string {
  if (tipo === "Tesouro") {
    return ""; // será setado pelo subtipo
  }
  const year = String(maturity.getUTCFullYear()).slice(-2);
  const issuerCode = issuer.id.replace("isr-", "").toUpperCase().slice(0, 4);
  const prefix = tipo === "Debênture" ? "DEB" : tipo;
  const suffix = String(index).padStart(2, "0");
  return `${prefix}-${issuerCode}${year}-${suffix}`;
}

function isinFor(rng: SeededRng): string {
  let s = "BR";
  for (let i = 0; i < 10; i++) {
    s += "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(rng.int(0, 35));
  }
  return s;
}

// ── Gerador principal ──────────────────────────────────────────────

export interface GeneratedDataset {
  assets: Asset[];
  offers: Offer[];
  generatedAt: string;
  seed: number;
  count: number;
}

export function generate(
  count = 150,
  seed = GENERATOR_SEED,
): GeneratedDataset {
  const rng = createRng(seed);
  const assets: Asset[] = [];
  const offers: Offer[] = [];

  for (let i = 0; i < count; i++) {
    // 1. Tipo + indexador
    const tipo = weightedPick(rng, DIST_TIPO);

    // 2. Emissor & flag incentivada
    const pool = poolEmissores(tipo);
    const issuer = pool[rng.int(0, pool.length - 1)];
    const isIncentivada =
      tipo === "Debênture" && issuer.tag === "corporate_incentivada";

    // 3. Indexador respeitando distribuição alvo + universo permitido
    const universoIdx = poolIndexadores(tipo, isIncentivada);
    let indexador: Indexador;
    if (universoIdx.length === 1) {
      indexador = universoIdx[0];
    } else {
      // re-amostra até cair num indexador permitido
      let tries = 0;
      do {
        indexador = weightedPick(rng, DIST_INDEXADOR);
        tries++;
      } while (!universoIdx.includes(indexador) && tries < 10);
      if (!universoIdx.includes(indexador)) {
        indexador = universoIdx[rng.int(0, universoIdx.length - 1)];
      }
    }

    // 4. Datas
    const maturity = randomMaturity(rng);
    const issueDate = randomIssueDate(rng);
    const du = Math.max(1, diasUteis(HOJE, maturity));

    // 5. VN base (Tesouro/IPCA usam VNA_BASE; outros usam 1000)
    const vn = VNA_BASE;

    // 6. Para %CDI, sorteia o percentual (95–130)
    let percentCDI: number | undefined;
    let cupomReal: number | undefined;
    let taxaPre: number | undefined;

    if (indexador === "CDI") {
      percentCDI = Math.round(rng.range(95, 130) * 100) / 100;
    } else if (indexador === "IPCA") {
      cupomReal = Math.round(rng.range(0.055, 0.075) * 1e6) / 1e6;
    }
    // PRE: deixamos o pricing definir a "taxa nominal" = yield justo

    // 7. Pricing teórico
    const pricing = pricingFor({
      tipo,
      indexador,
      rating: issuer.rating,
      issueDate,
      maturity,
      vn,
      cupomReal,
      percentCDI,
      taxaPre,
      rng,
    });

    // 8. Para PRE: taxa "original" = yield justo arredondado a 0,05%
    if (indexador === "PRE") {
      taxaPre = Math.round(pricing.yieldJustoAnual * 2000) / 2000;
    }

    // 9. Tesouro: redefine ticker + tipo de subtítulo
    let ticker = tickerFor(tipo, issuer, maturity, i + 1);
    if (tipo === "Tesouro") {
      const sub = TESOURO_SUBTYPES.find((s) => s.indexer === indexador) ??
        TESOURO_SUBTYPES[0];
      ticker = `${sub.ticker}-${maturity.getUTCFullYear()}`;
    }

    // 10. CRI/CRA: appendix do devedor no nome do emissor (display name)
    let displayName = issuer.name;
    if (tipo === "CRI") {
      const devedor = DEVEDORES_CRI[rng.int(0, DEVEDORES_CRI.length - 1)];
      displayName = `${issuer.name} — ${devedor}`;
    } else if (tipo === "CRA") {
      const devedor = DEVEDORES_CRA[rng.int(0, DEVEDORES_CRA.length - 1)];
      displayName = `${issuer.name} — ${devedor}`;
    }

    // 11. PU atual ≈ PU justo com pequena variação de marcação (±0,5%)
    const currentPU = Math.round(
      pricing.puJusto * (1 + rng.range(-0.005, 0.005)) * 1e6,
    ) / 1e6;

    const asset: Asset = {
      id: `ast-${String(i + 1).padStart(4, "0")}`,
      ticker,
      type: tipo,
      issuer: {
        id: issuer.id,
        name: displayName,
        cnpj: issuer.cnpj,
        sector: issuer.sector,
        rating: issuer.rating,
      },
      issueDate: issueDate.toISOString(),
      maturity: maturity.toISOString(),
      faceValue: vn,
      currentPU,
      // originalRate = taxa de emissão. Para PRE, sorteamos algo próximo da curva
      // do dia em que foi emitido. Aproximação: usa yieldJustoAnual ±50bps.
      originalRate:
        indexador === "PRE"
          ? taxaPre ?? pricing.yieldJustoAnual
          : indexador === "IPCA"
            ? cupomReal ?? 0.065
            : (percentCDI ?? 100) / 100, // armazena % como decimal (1.15 = 115%)
      indexer: indexerLabel(indexador),
      indexerCode: indexador,
      isIncentivada,
      percentCDI,
      cupomReal,
      vna: pricing.vna,
      puJusto: pricing.puJusto,
      spreadCreditoBps: pricing.spreadCreditoBps,
      duration: pricing.duration,
      durationModificada: pricing.durationMod,
      dv01: pricing.dv01,
      couponFreq:
        indexador === "IPCA" || tipo === "Debênture"
          ? "semestral"
          : "no vencimento",
      isin: isinFor(rng),
    };

    assets.push(asset);

    // ── Oferta atrelada ──────────────────────────────────────────
    const delta = rng.range(-0.03, 0.015); // -3% a +1,5%
    const offeredPU =
      Math.round(pricing.puJusto * (1 + delta) * 1e6) / 1e6;

    // Yield bruto implícito a partir do PU ofertado
    let yieldBrutoAnual: number;
    let percentCDIOfertado: number | undefined;
    if (indexador === "PRE") {
      yieldBrutoAnual = calcularYieldImplicito_PreFixado(offeredPU, vn, du);
    } else if (indexador === "CDI") {
      const cdiProj = cdiProjetadoPara(du);
      const r = calcularYieldImplicito_CDI(offeredPU, vn, du, cdiProj);
      yieldBrutoAnual = r.taxaEquivAnual;
      percentCDIOfertado = r.percentCDI;
    } else {
      yieldBrutoAnual = calcularYieldImplicito_IPCA(
        offeredPU,
        pricing.vna ?? vn,
        du,
      );
    }

    // IR + perfil
    const sellerType = SELLER_TYPES[rng.int(0, SELLER_TYPES.length - 1)];
    const perfil: Perfil =
      sellerType === "PF" ? "PF" : "PJ"; // só PF é PF; FO/AM/PJ tratam como PJ
    const prazoDias = diasCorridos(HOJE, maturity);
    const yieldLiquidoAnual = calcularYieldLiquido(
      yieldBrutoAnual,
      tipo,
      prazoDias,
      perfil,
      isIncentivada,
    );
    const vsCDI = comparacaoVsCDI(yieldLiquidoAnual, cdiProjetadoPara(du));

    // Spread vs curva ativa (DI_B3 default): comparamos contra a taxa justa
    // (taxa_curva no vértice) — para CDI usamos taxa equivalente.
    const taxaCurvaNoVertice =
      indexador === "IPCA"
        ? interpolarCurva(CURVA_ANBIMA_IPCA, du)
        : indexador === "CDI"
          ? cdiProjetadoPara(du) // benchmark = 100% CDI
          : interpolarCurva(CURVA_DI_B3, du);
    const spreadVsCurvaBps =
      (yieldBrutoAnual - taxaCurvaNoVertice) * 10_000;

    // Ágio/Deságio em bps vs PU justo
    const agioDeagioBps =
      (yieldBrutoAnual - pricing.yieldJustoAnual) * 10_000;
    const agioDeagioPct = (offeredPU - currentPU) / currentPU;

    // Urgência: distribuição 35/45/20
    const urgRoll = rng.next();
    const urgency: Urgency =
      urgRoll < 0.35 ? "Baixa" : urgRoll < 0.8 ? "Média" : "Alta";

    // Quantidade & volume
    const quantity = rng.int(20, 800);
    const volume = quantity * offeredPU;

    // Datas
    const createdOffset = rng.int(0, 6); // 0–6 dias atrás
    const createdAt = new Date(HOJE);
    createdAt.setUTCDate(createdAt.getUTCDate() - createdOffset);
    const expiresAt = addBusinessDays(createdAt, rng.int(2, 10));

    // Status: ~85% Disponível, 8% Em negociação, 5% Pendente, 2% Executada
    const sRoll = rng.next();
    const status: Offer["status"] =
      sRoll < 0.85
        ? "Disponível"
        : sRoll < 0.93
          ? "Em negociação"
          : sRoll < 0.98
            ? "Pendente"
            : "Executada";

    const partialOffer: Offer = {
      id: `of-${String(i + 1).padStart(4, "0")}`,
      asset,
      sellerId: `seller-${String(rng.int(1000, 9999))}`,
      sellerType,
      offeredPU,
      offeredRate: yieldBrutoAnual, // legado: mantém igual ao yield bruto
      quantity,
      volume,
      agioDeagioPct,
      urgency,
      status,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      matchScore: 0, // calculado já já
      yieldBrutoAnual,
      yieldLiquidoAnual,
      percentCDILiquido: vsCDI.percentCDI,
      spreadVsCurvaBps,
      agioDeagioBps,
    };
    partialOffer.matchScore = calcularMatchScore(partialOffer, {});

    // Adiciona percentCDI sobrescrito se for CDI
    if (percentCDIOfertado != null) {
      // armazenamos como número decimal-percent (115 = 115%) em offeredRate
      partialOffer.offeredRate = percentCDIOfertado / 100;
    }

    offers.push(partialOffer);
  }

  return {
    assets,
    offers,
    generatedAt: HOJE.toISOString(),
    seed,
    count,
  };
}
