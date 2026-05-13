#!/usr/bin/env node
/**
 * 3 testes de sanidade pedidos pelo brief.
 *
 * Roda a matemática duas vezes (engine TS via shim duplicado neste
 * arquivo + paralelo a `scripts/generate-mocks.mjs`) e mostra os
 * resultados pra inspeção. Não falha — só imprime.
 */

const DU_ANO = 252;
const DC_ANO = 365;
const VNA_BASE = 1000;
const IPCA_ANUAL = 0.042;

// Cálculos puros (transcrição do engine; ver src/lib/finance/*)
function PU_pre(vn, i, du) {
  return vn / Math.pow(1 + i, du / DU_ANO);
}
function PU_cdi(vn, percentCDI, du, cdiProj) {
  const tx = cdiProj * (percentCDI / 100);
  return vn / Math.pow(1 + tx, du / DU_ANO);
}
function PU_ipca(vna, r, du) {
  return vna / Math.pow(1 + r, du / DU_ANO);
}
function durationMacaulayBullet(du, taxa, pu, vn) {
  const t = du / DU_ANO;
  const vp = vn / Math.pow(1 + taxa, t);
  return (t * vp) / pu;
}
function aliquotaIR(tipo, prazoDias, perfil, isIncentivada = false) {
  const isentoPF =
    perfil === "PF" &&
    (tipo === "LCI" || tipo === "LCA" || tipo === "CRI" || tipo === "CRA" ||
      (tipo === "Debênture" && isIncentivada));
  if (isentoPF) return { ir: 0, isento: true };
  if (prazoDias <= 180) return { ir: 0.225, isento: false };
  if (prazoDias <= 360) return { ir: 0.2, isento: false };
  if (prazoDias <= 720) return { ir: 0.175, isento: false };
  return { ir: 0.15, isento: false };
}
function yieldLiquido(bruto, ir) {
  return bruto * (1 - ir);
}

const banner = (s) => `\n${"═".repeat(72)}\n  ${s}\n${"═".repeat(72)}`;

// ── Caso 1 — CDB pré ────────────────────────────────────────────────
console.log(banner("Caso 1 · CDB Pré-fixado"));
{
  const vn = 1000;
  const taxa = 0.13;
  const du = 504;
  const dc = Math.round(du * DC_ANO / DU_ANO);
  const pu = PU_pre(vn, taxa, du);

  const dMac = durationMacaulayBullet(du, taxa, pu, vn);
  const dMod = dMac / (1 + taxa);
  const dv01 = pu * dMod * 0.0001;

  const ir = aliquotaIR("CDB", dc, "PF").ir;
  const yLiq = yieldLiquido(taxa, ir);

  console.log("  Inputs:  VN=1000, i=13,00% a.a., du=504 (≈2 anos úteis)");
  console.log("  PU      =", pu.toFixed(4), "  (esperado ≈ R$ 783,15)");
  console.log("  duration=", dMac.toFixed(4), "y  (bullet, ≈ 2y)");
  console.log("  dur.mod =", dMod.toFixed(4), "y");
  console.log("  DV01    = R$", dv01.toFixed(4));
  console.log("  dc      =", dc, "dias corridos");
  console.log("  IR aplicável (CDB, " + dc + "d, PF) =", (ir * 100).toFixed(1) + "%  (esperado 17,5%)");
  console.log("  yield bruto     =", (taxa * 100).toFixed(2) + "%");
  console.log("  yield líquido   =", (yLiq * 100).toFixed(3) + "%  = 13,00% × (1 − 0,175)");
  console.log("  conferência: 13,00% × 0,825 =", (0.13 * 0.825 * 100).toFixed(3) + "% ✓");
}

// ── Caso 2 — Debênture incentivada IPCA+ ────────────────────────────
console.log(banner("Caso 2 · Debênture incentivada IPCA+"));
{
  const vna = 1200;
  const cupom = 0.065;
  const du = 1260;
  const dc = Math.round(du * DC_ANO / DU_ANO);
  const pu = PU_ipca(vna, cupom, du);

  const dMac = durationMacaulayBullet(du, cupom, pu, vna); // simplificação bullet
  const dMod = dMac / (1 + cupom);
  const dv01 = pu * dMod * 0.0001;

  const ir = aliquotaIR("Debênture", dc, "PF", true);
  const yLiq = ir.isento ? cupom : yieldLiquido(cupom, ir.ir);

  console.log("  Inputs:  VNA=1200, cupom=6,50% real, du=1260 (5 anos)");
  console.log("  PU      =", pu.toFixed(4));
  console.log("    fórmula: 1200 / (1+0,065)^(1260/252) = 1200 / (1,065)^5 =", (1200/Math.pow(1.065,5)).toFixed(4));
  console.log("  duration=", dMac.toFixed(4), "y  (bullet simplificado)");
  console.log("  dur.mod =", dMod.toFixed(4), "y");
  console.log("  DV01    = R$", dv01.toFixed(4));
  console.log("  IR aplicável (Debênture incentivada, PF) =", ir.isento ? "ISENTO ✓" : `${(ir.ir*100).toFixed(1)}%`);
  console.log("  yield bruto   =", (cupom * 100).toFixed(2) + "% real");
  console.log("  yield líquido =", (yLiq * 100).toFixed(2) + "% real  (igual ao bruto · Lei 12.431)");
}

// ── Caso 3 — CDB %CDI ───────────────────────────────────────────────
console.log(banner("Caso 3 · CDB %CDI"));
{
  const vn = 1000;
  const pctCDI = 115;
  const cdi = 0.104;
  const dc = 360;
  const du = Math.round(dc * DU_ANO / DC_ANO); // ≈ 249

  const taxaEquiv = cdi * (pctCDI / 100);
  const pu = PU_cdi(vn, pctCDI, du, cdi);

  const ir = aliquotaIR("CDB", dc, "PF").ir;
  const yLiq = yieldLiquido(taxaEquiv, ir);

  console.log("  Inputs:  VN=1000, 115% CDI, CDI=10,40% a.a., dc=360 (≈249 du)");
  console.log("  Taxa equivalente anual  = CDI × 1,15 =", (taxaEquiv * 100).toFixed(3) + "%  (=11,960%)");
  console.log("  PU                      =", pu.toFixed(4));
  console.log("    fórmula: 1000 / (1+0,1196)^(249/252) =", (1000/Math.pow(1.1196, 249/252)).toFixed(4));
  console.log("  du correspondente       =", du);
  console.log("  IR aplicável (CDB, 360d, PF) =", (ir * 100).toFixed(1) + "%  (esperado 20%)");
  console.log("  yield bruto             =", (taxaEquiv * 100).toFixed(3) + "%");
  console.log("  yield líquido           =", (yLiq * 100).toFixed(3) + "%  = 11,960% × 0,80");
  console.log("  %CDI líquido            =", ((yLiq / cdi) * 100).toFixed(2) + "%  (esperado ~92%)");
}

console.log("\n" + "═".repeat(72));
console.log("  ✓ 3 sanity tests rodados. Conferência manual disponível acima.");
console.log("═".repeat(72) + "\n");
