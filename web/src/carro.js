// Cromossomo do carro: 14 genes reais em [0, 1].
//   0..7   raio de cada um dos 8 vértices da carroceria (ângulos fixos, a cada 45°)
//   8, 9   roda A: vértice onde está presa, raio
//   10, 11 roda B: vértice onde está presa, raio
//   12     densidade da carroceria
//   13     densidade das rodas
// A decodificação transforma esses números em medidas físicas.

import { sin, cos } from './dmath.js';

export const N_VERTICES = 8;
export const N_GENES = 14;
export const NOMES_GENES = [
  ...Array.from({ length: N_VERTICES }, (_, i) => `raio v${i}`),
  'roda A: vértice', 'roda A: raio', 'roda B: vértice', 'roda B: raio',
  'densidade carroceria', 'densidade rodas',
];

export const LIMITES = {
  raioVertice: [0.25, 1.6],  // m
  raioRoda: [0.18, 0.85],    // m
  densCarroceria: [0.6, 5],  // kg/m²
  densRoda: [0.6, 5],
};

const escala = ([a, b], g) => a + (b - a) * g;

export function genomaAleatorio(rng) {
  return Array.from({ length: N_GENES }, () => rng());
}

/** Converte o genoma em medidas físicas. */
export function decodificar(g) {
  const vertices = [];
  for (let i = 0; i < N_VERTICES; i++) {
    const ang = (2 * Math.PI * i) / N_VERTICES;
    const r = escala(LIMITES.raioVertice, g[i]);
    vertices.push([r * cos(ang), r * sin(ang)]);
  }
  const roda = (gv, gr) => ({
    vertice: Math.min(N_VERTICES - 1, Math.floor(gv * N_VERTICES)),
    raio: escala(LIMITES.raioRoda, gr),
  });
  return {
    vertices,
    rodas: [roda(g[8], g[9]), roda(g[10], g[11])],
    densCarroceria: escala(LIMITES.densCarroceria, g[12]),
    densRoda: escala(LIMITES.densRoda, g[13]),
  };
}
