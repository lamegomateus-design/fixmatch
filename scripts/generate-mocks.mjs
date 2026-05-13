#!/usr/bin/env node
/**
 * One-shot snapshot generator. Produces src/data/generated.json com 150
 * ativos + ofertas coerentes (seed determinística = 42).
 *
 * A matemática aqui é uma transcrição literal das funções em
 * src/lib/finance/*. Mantemos as duas implementações sincronizadas via
 * testes de sanidade (passo 6) que comparam outputs com pontos-âncora.
 *
 * Uso:
 *   node scripts/generate-mocks.mjs
 *
 * Não introduz novas dependências; só usa o `fs`/`path`/`url` do Node.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const OUT_PATH = join(REPO_ROOT, "src", "data", "generated.json");

// ── Constants (espelha src/lib/finance/constants.ts) ───────────────
const CDI_ANUAL = 0.144;
const IPCA_ANUAL = 0.042;
const DU_ANO = 252;
const VNA_BASE = 1000;

// ── Holidays ANBIMA 2024–2030 (espelha src/lib/finance/holidays.ts) ─
const HOLIDAYS = new Set([
  "2024-01-01","2024-02-12","2024-02-13","2024-03-29","2024-04-21","2024-05-01","2024-05-30","2024-09-07","2024-10-12","2024-11-02","2024-11-15","2024-11-20","2024-12-25",
  "2025-01-01","2025-03-03","2025-03-04","2025-04-18","2025-04-21","2025-05-01","2025-06-19","2025-09-07","2025-10-12","2025-11-02","2025-11-15","2025-11-20","2025-12-25",
  "2026-01-01","2026-02-16","2026-02-17","2026-04-03","2026-04-21","2026-05-01","2026-06-04","2026-09-07","2026-10-12","2026-11-02","2026-11-15","2026-11-20","2026-12-25",
  "2027-01-01","2027-02-08","2027-02-09","2027-03-26","2027-04-21","2027-05-01","2027-05-27","2027-09-07","2027-10-12","2027-11-02","2027-11-15","2027-11-20","2027-12-25",
  "2028-01-01","2028-02-28","2028-02-29","2028-04-14","2028-04-21","2028-05-01","2028-06-15","2028-09-07","2028-10-12","2028-11-02","2028-11-15","2028-11-20","2028-12-25",
  "2029-01-01","2029-02-12","2029-02-13","2029-03-30","2029-04-21","2029-05-01","2029-05-31","2029-09-07","2029-10-12","2029-11-02","2029-11-15","2029-11-20","2029-12-25",
  "2030-01-01","2030-03-04","2030-03-05","2030-04-19","2030-04-21","2030-05-01","2030-06-20","2030-09-07","2030-10-12","2030-11-02","2030-11-15","2030-11-20","2030-12-25",
]);

const HOJE = new Date("2026-05-11T00:00:00Z");

function toKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
}
function startOfUTC(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function isBusinessDay(d) {
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !HOLIDAYS.has(toKey(d));
}
function diasUteis(inicio, fim) {
  const s = startOfUTC(inicio); const e = startOfUTC(fim);
  if (e.getTime() <= s.getTime()) return 0;
  let n = 0; const cur = new Date(s);
  while (cur.getTime() < e.getTime()) {
    if (isBusinessDay(cur)) n++;
    cur.setUTCDate(cur.getUTCDate()+1);
  }
  return n;
}
function diasCorridos(inicio, fim) {
  const s = startOfUTC(inicio); const e = startOfUTC(fim);
  return Math.max(0, Math.round((e.getTime()-s.getTime())/86_400_000));
}
function addBusinessDays(d, n) {
  const cur = startOfUTC(d); let r = n;
  while (r > 0) { cur.setUTCDate(cur.getUTCDate()+1); if (isBusinessDay(cur)) r--; }
  return cur;
}

// ── PU/Yield (espelha src/lib/finance/pu.ts + yield.ts) ─────────────
function calcularPU_PreFixado(vn, i, du) {
  if (du <= 0) return vn;
  return vn / Math.pow(1+i, du/DU_ANO);
}
function calcularPU_CDI(vn, percentCDI, du, cdiProj) {
  if (du <= 0) return vn;
  const tx = cdiProj * (percentCDI/100);
  return vn / Math.pow(1+tx, du/DU_ANO);
}
function calcularPU_IPCA(vna, r, du) {
  if (du <= 0) return vna;
  return vna / Math.pow(1+r, du/DU_ANO);
}
function atualizarVNA(base, ipca, dc) {
  if (dc <= 0) return base;
  return base * Math.pow(1+ipca, dc/365);
}
function calcularYieldImplicito_PreFixado(pu, vn, du) {
  if (du <= 0 || pu <= 0) return 0;
  return Math.pow(vn/pu, DU_ANO/du) - 1;
}
function calcularYieldImplicito_CDI(pu, vn, du, cdiProj) {
  if (du <= 0 || pu <= 0 || cdiProj <= 0) return { percentCDI: 0, taxaEquivAnual: 0 };
  const tx = Math.pow(vn/pu, DU_ANO/du) - 1;
  return { percentCDI: (tx/cdiProj)*100, taxaEquivAnual: tx };
}
function calcularYieldImplicito_IPCA(pu, vna, du) {
  if (du <= 0 || pu <= 0) return 0;
  return Math.pow(vna/pu, DU_ANO/du) - 1;
}

// ── Curves (espelha src/lib/finance/curves.ts) ──────────────────────
const VERT_DU = [21, 63, 126, 252, 504, 756, 1008, 1260, 1764, 2520];
const DI_B3 = VERT_DU.map((du, i) => ({
  duDias: du,
  taxa: CDI_ANUAL + [0.0,0.0008,0.0024,0.0058,0.0095,0.0118,0.0135,0.0148,0.0162,0.0192][i],
}));
const ANBIMA_IPCA = [
  {duDias: 126, taxa: 0.07},{duDias: 252, taxa: 0.0715},{duDias: 504, taxa: 0.0735},
  {duDias: 756, taxa: 0.0752},{duDias: 1008, taxa: 0.0765},{duDias: 1260, taxa: 0.0775},
  {duDias: 1764, taxa: 0.0788},{duDias: 2520, taxa: 0.08},
];
function interpolar(curva, du) {
  if (curva.length === 0) return 0;
  if (du <= curva[0].duDias) return curva[0].taxa;
  if (du >= curva[curva.length-1].duDias) return curva[curva.length-1].taxa;
  for (let i = 0; i < curva.length-1; i++) {
    const a = curva[i], b = curva[i+1];
    if (du >= a.duDias && du <= b.duDias) {
      const r = (du - a.duDias) / (b.duDias - a.duDias);
      return a.taxa + (b.taxa - a.taxa) * r;
    }
  }
  return curva[curva.length-1].taxa;
}
const cdiProjetadoPara = (du) => interpolar(DI_B3, du);

// ── Duration ────────────────────────────────────────────────────────
function fluxoBullet(maturity, valor) { return [{data: maturity, valor}]; }
function fluxoComCupom(emissao, vencimento, principal, taxaCupom, freq) {
  const passos = freq === "semestral" ? 6 : 12;
  const periodosPorAno = freq === "semestral" ? 2 : 1;
  const cupom = principal * (Math.pow(1+taxaCupom, 1/periodosPorAno) - 1);
  const fluxos = [];
  const cur = new Date(emissao);
  cur.setUTCMonth(cur.getUTCMonth() + passos);
  while (cur.getTime() < vencimento.getTime()) {
    fluxos.push({data: new Date(cur), valor: cupom});
    cur.setUTCMonth(cur.getUTCMonth() + passos);
  }
  fluxos.push({data: new Date(vencimento), valor: cupom + principal});
  return fluxos;
}
function durationMacaulay(fluxos, taxa, hoje, pu) {
  let svp = 0, sum = 0;
  for (const f of fluxos) {
    const du = diasUteis(hoje, f.data);
    if (du <= 0) continue;
    const t = du / DU_ANO;
    const vp = f.valor / Math.pow(1+taxa, t);
    svp += vp; sum += t * vp;
  }
  const denom = pu && pu > 0 ? pu : svp;
  return denom > 0 ? sum / denom : 0;
}

// ── Taxation (espelha src/lib/finance/taxation.ts) ──────────────────
function aliquotaIR({tipoAtivo, isIncentivada, prazoDias, perfil}) {
  const ehIsentoPF = perfil === "PF" && (
    tipoAtivo === "LCI" || tipoAtivo === "LCA" ||
    tipoAtivo === "CRI" || tipoAtivo === "CRA" ||
    (tipoAtivo === "Debênture" && !!isIncentivada)
  );
  if (ehIsentoPF) return { ir: 0, isento: true };
  let ir;
  if (prazoDias <= 180) ir = 0.225;
  else if (prazoDias <= 360) ir = 0.2;
  else if (prazoDias <= 720) ir = 0.175;
  else ir = 0.15;
  return { ir, isento: false };
}
function calcularYieldLiquido(bruto, tipo, prazoDias, perfil, isIncentivada) {
  const { ir, isento } = aliquotaIR({tipoAtivo: tipo, isIncentivada, prazoDias, perfil});
  if (isento || prazoDias >= 30) return isento ? bruto : bruto * (1 - ir);
  // (raro no MVP) prazo < 30 dias: ignorado nesse script
  return bruto * (1 - ir);
}

// ── Match score (espelha src/lib/finance/match.ts) ──────────────────
function calcularMatchScore(offer, demanda = {}) {
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  let taxa = 20;
  if (demanda.taxaDesejada != null) {
    const delta = ((offer.yieldBrutoAnual ?? offer.offeredRate) - demanda.taxaDesejada) * 10000;
    taxa = clamp(40 * (delta + 50) / 100, 0, 40);
  }
  let duration = 12.5;
  if (offer.asset.duration != null && demanda.durationDesejado != null) {
    const d = Math.abs(offer.asset.duration - demanda.durationDesejado);
    duration = 25 * Math.max(0, 1 - d/3);
  }
  let volume = 10;
  if (demanda.volumeBuscado && demanda.volumeBuscado > 0) {
    volume = 20 * Math.min(1, offer.volume / demanda.volumeBuscado);
  }
  let rating = 5;
  // sem demanda concreta — neutro
  let urgencia = offer.urgency === "Alta" ? 5 : offer.urgency === "Média" ? 3 : 1;
  const total = Math.round(taxa + duration + volume + rating + urgencia);
  return clamp(total, 0, 100);
}

// ── RNG (espelha src/lib/rng.ts) ────────────────────────────────────
function createRng(seed) {
  let s = (seed >>> 0) || 1;
  const next = () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (mn, mx) => mn + (mx - mn) * next(),
    int: (mn, mx) => Math.floor(mn + (mx - mn + 1) * next()),
    pick: (a) => a[Math.floor(next() * a.length)],
  };
}

// ── Issuers (espelha src/data/issuers.ts) ───────────────────────────
const banks = [
  ["isr-btg","Banco BTG Pactual","30.306.294/0001-45","Bancário","AAA"],
  ["isr-bmg","Banco BMG","61.186.680/0001-74","Bancário","AA-"],
  ["isr-pan","Banco Pan","59.285.411/0001-13","Bancário","AA"],
  ["isr-day","Banco Daycoval","62.232.889/0001-90","Bancário","AA"],
  ["isr-abc","Banco ABC Brasil","28.195.667/0001-06","Bancário","AA+"],
  ["isr-bnb","Banco do Nordeste","07.237.373/0001-20","Bancário","AA+"],
  ["isr-int","Banco Inter","00.416.968/0001-01","Bancário","A+"],
  ["isr-org","Banco Original","92.894.922/0001-08","Bancário","A"],
].map(([id,name,cnpj,sector,rating]) => ({id,name,cnpj,sector,rating,tag:"bank"}));

const corporatesComuns = [
  ["isr-vale","Vale","33.592.510/0001-54","Mineração","AAA"],
  ["isr-petr","Petrobras","33.000.167/0001-01","Óleo & Gás","AAA"],
  ["isr-loca","Localiza","16.670.085/0001-55","Locação","AA+"],
  ["isr-rumo","Rumo","02.387.241/0001-60","Logística","AA"],
  ["isr-enrg","Energisa","00.864.214/0001-06","Energia Elétrica","AA-"],
  ["isr-eqtl","Equatorial","03.220.438/0001-73","Energia Elétrica","AA"],
  ["isr-klbn","Klabin","89.637.490/0001-45","Papel & Celulose","AA"],
  ["isr-suza","Suzano","16.404.287/0001-55","Papel & Celulose","AA+"],
  ["isr-cmig","Cemig","17.155.730/0001-64","Energia Elétrica","A+"],
  ["isr-jbss","JBS","02.916.265/0001-60","Alimentos","AA"],
].map(([id,name,cnpj,sector,rating]) => ({id,name,cnpj,sector,rating,tag:"corporate"}));

const corporatesIncentivadas = [
  ["isr-aege","Aegea Saneamento","08.184.290/0001-83","Saneamento","AA-"],
  ["isr-engi","Engie Brasil","02.474.103/0001-19","Energia Elétrica","AA+"],
  ["isr-elet","Eletrobras","00.001.180/0001-26","Energia Elétrica","AA"],
  ["isr-aess","AES Brasil","37.663.076/0001-07","Energia Elétrica","A+"],
  ["isr-neoe","Neoenergia","01.083.200/0001-18","Energia Elétrica","AA"],
  ["isr-igua","Iguá Saneamento","10.611.882/0001-22","Saneamento","A"],
  ["isr-sabe","Sabesp","43.776.517/0001-80","Saneamento","AA+"],
].map(([id,name,cnpj,sector,rating]) => ({id,name,cnpj,sector,rating,tag:"corporate_incentivada"}));

const securitizadoras = [
  ["isr-opea","Opea Securitizadora","02.773.542/0001-22","Securitização","A+"],
  ["isr-true","True Securitizadora","12.130.744/0001-00","Securitização","A"],
  ["isr-rbcp","RB Capital","07.581.521/0001-13","Securitização","A+"],
  ["isr-habt","Habitasec","09.304.427/0001-58","Securitização","A-"],
  ["isr-virg","Virgo Securitizadora","08.769.451/0001-08","Securitização","BBB+"],
].map(([id,name,cnpj,sector,rating]) => ({id,name,cnpj,sector,rating,tag:"securitizadora"}));

const governo = [
  ["isr-stn","Tesouro Nacional","00.394.460/0001-41","Governo","AAA"],
].map(([id,name,cnpj,sector,rating]) => ({id,name,cnpj,sector,rating,tag:"governo"}));

// ── Geração ────────────────────────────────────────────────────────
const DIST_TIPO = { CDB:0.3, LCI:0.15, LCA:0.1, "Debênture":0.25, CRI:0.1, CRA:0.05, Tesouro:0.05 };
const DIST_IDX  = { PRE:0.35, CDI:0.35, IPCA:0.3 };
const SPREAD_BPS = {
  AAA:[30,70],"AA+":[70,110],AA:[110,160],"AA-":[160,210],
  "A+":[210,280],A:[280,360],"A-":[360,450],
  "BBB+":[450,600],BBB:[600,750],"BBB-":[750,900],BB:[900,1100],B:[1100,1400],
};
const TESOURO = [
  {ticker:"LTN", indexer:"PRE"},
  {ticker:"NTN-B", indexer:"IPCA"},
  {ticker:"LFT", indexer:"CDI"},
];
const SELLER_TYPES = ["PJ","PF","Family Office","Asset Manager"];
const DEV_CRI = ["Cyrela","Eztec","Direcional","Helbor","MRV","Plano&Plano"];
const DEV_CRA = ["JBS","BRF","Marfrig","Minerva","São Martinho","SLC Agrícola","3tentos"];

function poolEmissores(tipo) {
  switch (tipo) {
    case "CDB": case "LCI": case "LCA": return banks;
    case "Debênture": return [...corporatesComuns, ...corporatesIncentivadas];
    case "CRI": case "CRA": return securitizadoras;
    case "Tesouro": return governo;
  }
}
function poolIndexadores(tipo, isInc) {
  if (isInc) return ["IPCA"];
  if (tipo === "LCI" || tipo === "LCA") return ["CDI","PRE"];
  if (tipo === "CRI" || tipo === "CRA") return ["IPCA","PRE"];
  if (tipo === "Debênture") return ["IPCA","PRE","CDI"];
  if (tipo === "Tesouro") return ["PRE","IPCA","CDI"];
  if (tipo === "CDB") return ["PRE","CDI"];
  return ["PRE"];
}
function weightedPick(rng, dist) {
  const r = rng.next(); let acc = 0;
  for (const k in dist) { acc += dist[k]; if (r <= acc) return k; }
  const keys = Object.keys(dist); return keys[keys.length-1];
}
function indexerLabel(c) { return c==="PRE"?"Pré":c==="IPCA"?"IPCA+":"CDI"; }
function randomMaturity(rng) {
  const min = 180, max = 365*10;
  const d = new Date(HOJE); d.setUTCDate(d.getUTCDate() + rng.int(min, max)); return d;
}
function randomIssueDate(rng) {
  const start = new Date("2022-01-15T00:00:00Z").getTime();
  const end = HOJE.getTime() - 86_400_000 * 30;
  return new Date(rng.range(start, end));
}
function isinFor(rng) {
  let s = "BR"; const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let i = 0; i < 10; i++) s += A.charAt(rng.int(0, A.length-1));
  return s;
}
function tickerFor(tipo, issuer, maturity, idx) {
  if (tipo === "Tesouro") return "";
  const year = String(maturity.getUTCFullYear()).slice(-2);
  const code = issuer.id.replace("isr-","").toUpperCase().slice(0,4);
  const prefix = tipo === "Debênture" ? "DEB" : tipo;
  return `${prefix}-${code}${year}-${String(idx).padStart(2,"0")}`;
}

function generate(seed = 42, count = 150) {
  const rng = createRng(seed);
  const assets = []; const offers = [];

  for (let i = 0; i < count; i++) {
    const tipo = weightedPick(rng, DIST_TIPO);
    const pool = poolEmissores(tipo);
    const issuer = pool[rng.int(0, pool.length-1)];
    const isIncentivada = tipo === "Debênture" && issuer.tag === "corporate_incentivada";

    const universoIdx = poolIndexadores(tipo, isIncentivada);
    let indexador;
    if (universoIdx.length === 1) {
      indexador = universoIdx[0];
    } else {
      let tries = 0;
      do { indexador = weightedPick(rng, DIST_IDX); tries++; }
      while (!universoIdx.includes(indexador) && tries < 10);
      if (!universoIdx.includes(indexador)) indexador = universoIdx[rng.int(0, universoIdx.length-1)];
    }

    const maturity = randomMaturity(rng);
    const issueDate = randomIssueDate(rng);
    const du = Math.max(1, diasUteis(HOJE, maturity));
    const vn = VNA_BASE;

    let percentCDI, cupomReal, taxaPre;
    if (indexador === "CDI") percentCDI = Math.round(rng.range(95, 130) * 100) / 100;
    else if (indexador === "IPCA") cupomReal = Math.round(rng.range(0.055, 0.075) * 1e6) / 1e6;

    // Pricing teórico
    const taxaCurva = indexador === "IPCA" ? interpolar(ANBIMA_IPCA, du) : interpolar(DI_B3, du);
    const [spLow, spHigh] = SPREAD_BPS[issuer.rating];
    const spreadBps = indexador === "IPCA"
      ? Math.round(rng.range(spLow * 0.5, spHigh * 0.5))
      : Math.round(rng.range(spLow, spHigh));
    const yieldJustoAnual = taxaCurva + spreadBps/10_000;

    let puJusto, vna, fluxos;
    if (indexador === "IPCA") {
      const dc = diasCorridos(issueDate, HOJE);
      vna = atualizarVNA(VNA_BASE, IPCA_ANUAL, dc);
      const r = cupomReal ?? yieldJustoAnual;
      puJusto = calcularPU_IPCA(vna, r, du);
      fluxos = fluxoComCupom(issueDate, maturity, vna, r, "semestral");
    } else if (indexador === "CDI") {
      const cdiProj = cdiProjetadoPara(du);
      const p = percentCDI ?? 100;
      puJusto = calcularPU_CDI(vn, p, du, cdiProj);
      fluxos = fluxoBullet(maturity, vn);
    } else {
      const i = taxaPre ?? yieldJustoAnual;
      puJusto = calcularPU_PreFixado(vn, i, du);
      fluxos = tipo === "Debênture"
        ? fluxoComCupom(issueDate, maturity, vn, i, "semestral")
        : fluxoBullet(maturity, vn);
    }

    const dMac = durationMacaulay(fluxos, yieldJustoAnual, HOJE, puJusto);
    const dMod = dMac / (1 + yieldJustoAnual);
    const dv01 = Math.abs(puJusto * dMod * 0.0001);

    if (indexador === "PRE") taxaPre = Math.round(yieldJustoAnual * 2000) / 2000;

    let ticker = tickerFor(tipo, issuer, maturity, i+1);
    if (tipo === "Tesouro") {
      const sub = TESOURO.find(s => s.indexer === indexador) ?? TESOURO[0];
      ticker = `${sub.ticker}-${maturity.getUTCFullYear()}`;
    }

    let displayName = issuer.name;
    if (tipo === "CRI") displayName += " — " + DEV_CRI[rng.int(0, DEV_CRI.length-1)];
    if (tipo === "CRA") displayName += " — " + DEV_CRA[rng.int(0, DEV_CRA.length-1)];

    const currentPU = Math.round(puJusto * (1 + rng.range(-0.005, 0.005)) * 1e6) / 1e6;

    const asset = {
      id: `ast-${String(i+1).padStart(4,"0")}`,
      ticker,
      type: tipo,
      issuer: {
        id: issuer.id, name: displayName, cnpj: issuer.cnpj,
        sector: issuer.sector, rating: issuer.rating,
      },
      issueDate: issueDate.toISOString(),
      maturity: maturity.toISOString(),
      faceValue: vn,
      currentPU,
      originalRate:
        indexador === "PRE" ? (taxaPre ?? yieldJustoAnual)
        : indexador === "IPCA" ? (cupomReal ?? 0.065)
        : (percentCDI ?? 100) / 100,
      indexer: indexerLabel(indexador),
      indexerCode: indexador,
      isIncentivada,
      percentCDI,
      cupomReal,
      vna,
      puJusto,
      spreadCreditoBps: spreadBps,
      duration: dMac,
      durationModificada: dMod,
      dv01,
      couponFreq: indexador === "IPCA" || tipo === "Debênture" ? "semestral" : "no vencimento",
      isin: isinFor(rng),
    };
    assets.push(asset);

    // Oferta
    const delta = rng.range(-0.03, 0.015);
    const offeredPU = Math.round(puJusto * (1 + delta) * 1e6) / 1e6;

    let yieldBrutoAnual, percentCDIOfertado;
    if (indexador === "PRE") {
      yieldBrutoAnual = calcularYieldImplicito_PreFixado(offeredPU, vn, du);
    } else if (indexador === "CDI") {
      const cdiProj = cdiProjetadoPara(du);
      const r = calcularYieldImplicito_CDI(offeredPU, vn, du, cdiProj);
      yieldBrutoAnual = r.taxaEquivAnual;
      percentCDIOfertado = r.percentCDI;
    } else {
      yieldBrutoAnual = calcularYieldImplicito_IPCA(offeredPU, vna ?? vn, du);
    }

    const sellerType = SELLER_TYPES[rng.int(0, SELLER_TYPES.length-1)];
    const perfil = sellerType === "PF" ? "PF" : "PJ";
    const prazoDias = diasCorridos(HOJE, maturity);
    const yieldLiquidoAnual = calcularYieldLiquido(yieldBrutoAnual, tipo, prazoDias, perfil, isIncentivada);
    const percentCDILiquido = (yieldLiquidoAnual / cdiProjetadoPara(du)) * 100;

    const taxaCurvaVert = indexador === "IPCA"
      ? interpolar(ANBIMA_IPCA, du)
      : indexador === "CDI" ? cdiProjetadoPara(du) : interpolar(DI_B3, du);
    const spreadVsCurvaBps = (yieldBrutoAnual - taxaCurvaVert) * 10000;
    const agioDeagioBps = (yieldBrutoAnual - yieldJustoAnual) * 10000;
    const agioDeagioPct = (offeredPU - currentPU) / currentPU;

    const urgRoll = rng.next();
    const urgency = urgRoll < 0.35 ? "Baixa" : urgRoll < 0.8 ? "Média" : "Alta";

    const quantity = rng.int(20, 800);
    const volume = quantity * offeredPU;
    const createdOffset = rng.int(0, 6);
    const createdAt = new Date(HOJE); createdAt.setUTCDate(createdAt.getUTCDate() - createdOffset);
    const expiresAt = addBusinessDays(createdAt, rng.int(2, 10));

    const sRoll = rng.next();
    const status = sRoll < 0.85 ? "Disponível"
      : sRoll < 0.93 ? "Em negociação"
      : sRoll < 0.98 ? "Pendente" : "Executada";

    const offer = {
      id: `of-${String(i+1).padStart(4,"0")}`,
      asset,
      sellerId: `seller-${String(rng.int(1000, 9999))}`,
      sellerType,
      offeredPU,
      offeredRate: percentCDIOfertado != null ? percentCDIOfertado / 100 : yieldBrutoAnual,
      quantity,
      volume,
      agioDeagioPct,
      urgency,
      status,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      matchScore: 0,
      yieldBrutoAnual,
      yieldLiquidoAnual,
      percentCDILiquido,
      spreadVsCurvaBps,
      agioDeagioBps,
    };
    offer.matchScore = calcularMatchScore(offer);
    offers.push(offer);
  }

  return {
    assets, offers,
    generatedAt: HOJE.toISOString(),
    seed, count,
  };
}

// ── Run ─────────────────────────────────────────────────────────────
const ds = generate(42, 150);

// estatísticas para auditoria
const byType = {};
const byIndexer = {};
const byStatus = {};
for (const a of ds.assets) byType[a.type] = (byType[a.type]||0)+1;
for (const a of ds.assets) byIndexer[a.indexerCode] = (byIndexer[a.indexerCode]||0)+1;
for (const o of ds.offers) byStatus[o.status] = (byStatus[o.status]||0)+1;

console.log("✓ Generated", ds.assets.length, "assets +", ds.offers.length, "offers");
console.log("  by type:    ", byType);
console.log("  by indexer: ", byIndexer);
console.log("  by status:  ", byStatus);

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(ds, null, 2));
console.log("✓ Wrote", OUT_PATH);
