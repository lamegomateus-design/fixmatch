import type { Asset } from "@/types";
import generated from "./generated.json";

/**
 * Universo de ativos do MVP. Hidratado do snapshot determinístico em
 * `generated.json` (seed = 42, 150 ativos coerentes com o engine).
 *
 * Para regenerar: `node scripts/generate-mocks.mjs`.
 */
export const assets: Asset[] = generated.assets as Asset[];
