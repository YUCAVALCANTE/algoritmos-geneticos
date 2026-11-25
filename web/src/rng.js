// Gerador pseudoaleatório determinístico (sfc32), semeado por um inteiro ou texto.
// Mesmo código no navegador e no Node: mesma semente, mesma sequência.
import { log, cos } from './dmath.js';

function hashSemente(semente) {
  const s = String(semente);
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const prox = () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
  return [prox(), prox(), prox(), prox()];
}

export function criarRng(semente) {
  let [a, b, c, d] = hashSemente(semente);
  const rng = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const r = (t + d) | 0;
    c = (c + r) | 0;
    return (r >>> 0) / 4294967296;
  };
  for (let i = 0; i < 12; i++) rng();
  return rng;
}

/** Inteiro em [0, n). */
export const inteiro = (rng, n) => Math.floor(rng() * n);

/** Normal padrão (Box-Muller). */
export function normal(rng) {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * log(u)) * cos(2 * Math.PI * rng());
}
