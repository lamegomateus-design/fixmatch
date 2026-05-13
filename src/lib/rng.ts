/**
 * Seeded pseudo-random number generator (mulberry32).
 * Deterministic given a seed. Used by mock generators so the JSON
 * snapshot é reproduzível entre rodadas.
 */

export interface SeededRng {
  /** Float em [0, 1). */
  next(): number;
  /** Float em [min, max). */
  range(min: number, max: number): number;
  /** Inteiro em [min, max]. */
  int(min: number, max: number): number;
  /** Escolhe um elemento aleatório do array. */
  pick<T>(arr: readonly T[]): T;
  /** Retorna true com probabilidade p ∈ [0,1]. */
  chance(p: number): boolean;
}

export function createRng(seed: number): SeededRng {
  let s = seed >>> 0 || 1;
  function next(): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    pick: <T>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
  };
}
