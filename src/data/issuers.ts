import type { Issuer, RatingTier } from "@/types";

/**
 * Lista oficial de emissores do FIXMATCH MVP.
 *
 * Tags semânticas (não fazem parte do tipo Issuer, são usadas pelo
 * gerador de mocks para decidir o universo de tipos de ativo de cada
 * emissor):
 *   - `bank`            → CDB / LCI / LCA
 *   - `corporate`       → Debênture comum
 *   - `corporate_incentivada` → Debênture incentivada (Lei 12.431)
 *   - `securitizadora`  → CRI / CRA
 *   - `governo`         → Tesouro
 */
export type IssuerTag =
  | "bank"
  | "corporate"
  | "corporate_incentivada"
  | "securitizadora"
  | "governo";

export interface IssuerWithMeta extends Issuer {
  tag: IssuerTag;
}

function mk(
  id: string,
  name: string,
  cnpj: string,
  sector: string,
  rating: RatingTier,
  tag: IssuerTag,
): IssuerWithMeta {
  return { id, name, cnpj, sector, rating, tag };
}

// ── Bancos ──────────────────────────────────────────────────────────
export const banks: IssuerWithMeta[] = [
  mk("isr-btg", "Banco BTG Pactual", "30.306.294/0001-45", "Bancário", "AAA", "bank"),
  mk("isr-bmg", "Banco BMG", "61.186.680/0001-74", "Bancário", "AA-", "bank"),
  mk("isr-pan", "Banco Pan", "59.285.411/0001-13", "Bancário", "AA", "bank"),
  mk("isr-day", "Banco Daycoval", "62.232.889/0001-90", "Bancário", "AA", "bank"),
  mk("isr-abc", "Banco ABC Brasil", "28.195.667/0001-06", "Bancário", "AA+", "bank"),
  mk("isr-bnb", "Banco do Nordeste", "07.237.373/0001-20", "Bancário", "AA+", "bank"),
  mk("isr-int", "Banco Inter", "00.416.968/0001-01", "Bancário", "A+", "bank"),
  mk("isr-org", "Banco Original", "92.894.922/0001-08", "Bancário", "A", "bank"),
];

// ── Corporates · debêntures comuns ──────────────────────────────────
export const corporatesComuns: IssuerWithMeta[] = [
  mk("isr-vale", "Vale", "33.592.510/0001-54", "Mineração", "AAA", "corporate"),
  mk("isr-petr", "Petrobras", "33.000.167/0001-01", "Óleo & Gás", "AAA", "corporate"),
  mk("isr-loca", "Localiza", "16.670.085/0001-55", "Locação", "AA+", "corporate"),
  mk("isr-rumo", "Rumo", "02.387.241/0001-60", "Logística", "AA", "corporate"),
  mk("isr-enrg", "Energisa", "00.864.214/0001-06", "Energia Elétrica", "AA-", "corporate"),
  mk("isr-eqtl", "Equatorial", "03.220.438/0001-73", "Energia Elétrica", "AA", "corporate"),
  mk("isr-klbn", "Klabin", "89.637.490/0001-45", "Papel & Celulose", "AA", "corporate"),
  mk("isr-suza", "Suzano", "16.404.287/0001-55", "Papel & Celulose", "AA+", "corporate"),
  mk("isr-cmig", "Cemig", "17.155.730/0001-64", "Energia Elétrica", "A+", "corporate"),
  mk("isr-jbss", "JBS", "02.916.265/0001-60", "Alimentos", "AA", "corporate"),
];

// ── Corporates · debêntures incentivadas (Lei 12.431) ───────────────
export const corporatesIncentivadas: IssuerWithMeta[] = [
  mk("isr-aege", "Aegea Saneamento", "08.184.290/0001-83", "Saneamento", "AA-", "corporate_incentivada"),
  mk("isr-engi", "Engie Brasil", "02.474.103/0001-19", "Energia Elétrica", "AA+", "corporate_incentivada"),
  mk("isr-elet", "Eletrobras", "00.001.180/0001-26", "Energia Elétrica", "AA", "corporate_incentivada"),
  mk("isr-aess", "AES Brasil", "37.663.076/0001-07", "Energia Elétrica", "A+", "corporate_incentivada"),
  mk("isr-neoe", "Neoenergia", "01.083.200/0001-18", "Energia Elétrica", "AA", "corporate_incentivada"),
  mk("isr-igua", "Iguá Saneamento", "10.611.882/0001-22", "Saneamento", "A", "corporate_incentivada"),
  mk("isr-sabe", "Sabesp", "43.776.517/0001-80", "Saneamento", "AA+", "corporate_incentivada"),
];

// ── Securitizadoras (para CRI / CRA) ────────────────────────────────
export const securitizadoras: IssuerWithMeta[] = [
  mk("isr-opea", "Opea Securitizadora", "02.773.542/0001-22", "Securitização", "A+", "securitizadora"),
  mk("isr-true", "True Securitizadora", "12.130.744/0001-00", "Securitização", "A", "securitizadora"),
  mk("isr-rbcp", "RB Capital", "07.581.521/0001-13", "Securitização", "A+", "securitizadora"),
  mk("isr-habt", "Habitasec", "09.304.427/0001-58", "Securitização", "A-", "securitizadora"),
  mk("isr-virg", "Virgo Securitizadora", "08.769.451/0001-08", "Securitização", "BBB+", "securitizadora"),
];

// ── Governo ─────────────────────────────────────────────────────────
export const governo: IssuerWithMeta[] = [
  mk("isr-stn", "Tesouro Nacional", "00.394.460/0001-41", "Governo", "AAA", "governo"),
];

/** Lista completa (mantém a forma `Issuer` exposta pelo type para a UI). */
export const issuersWithMeta: IssuerWithMeta[] = [
  ...banks,
  ...corporatesComuns,
  ...corporatesIncentivadas,
  ...securitizadoras,
  ...governo,
];

export const issuers: Issuer[] = issuersWithMeta.map(
  ({ tag: _tag, ...rest }) => rest,
);
