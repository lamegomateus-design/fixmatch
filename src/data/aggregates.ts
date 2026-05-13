import type { Indexador } from "@/types";
import agg from "./generated-aggregates.json";

/**
 * Agregações pré-computadas do snapshot atual (556 bytes). Importadas
 * por componentes que precisam só de números (ex.: probabilidade de
 * match no Sell Flow) sem trazer o JSON grande de ofertas pro bundle.
 *
 * Para regenerar: `node scripts/generate-mocks.mjs`.
 */
export const medianSpreadByIndexerBps: Record<Indexador, number> =
  agg.medianSpreadByIndexerBps as Record<Indexador, number>;

export const aggregates = agg;
