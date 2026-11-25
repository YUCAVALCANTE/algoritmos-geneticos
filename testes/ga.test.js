import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarRng } from '../web/src/rng.js';
import { torneio, cruzar, mutar, diversidade, proximaGeracao, ordenar, Evolucao } from '../web/src/ga.js';
import { genomaAleatorio, N_GENES } from '../web/src/carro.js';

test('rng: mesma semente, mesma sequência; sementes diferentes, sequências diferentes', () => {
  const a = criarRng(42), b = criarRng(42), c = criarRng(43);
  const sa = Array.from({ length: 5 }, a), sb = Array.from({ length: 5 }, b), sc = Array.from({ length: 5 }, c);
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  for (const v of sa) assert.ok(v >= 0 && v < 1);
});

test('torneio: com torneio grande vence quase sempre o melhor; com k=1 é sorteio uniforme', () => {
  const apt = [1, 5, 3, 9, 2, 0, 4, 8];
  const rng = criarRng(1);
  let vitoriasDoMelhor = 0;
  for (let i = 0; i < 2000; i++) if (torneio(apt, 20, rng) === 3) vitoriasDoMelhor++;
  assert.ok(vitoriasDoMelhor / 2000 > 0.9);
  const cont = new Array(apt.length).fill(0);
  for (let i = 0; i < 8000; i++) cont[torneio(apt, 1, rng)]++;
  for (const n of cont) assert.ok(Math.abs(n / 8000 - 1 / 8) < 0.03);
});

test('torneio: pressão de seleção cresce com o tamanho do torneio', () => {
  const apt = Array.from({ length: 40 }, (_, i) => i);
  const media = (k) => {
    const rng = criarRng(k);
    let s = 0;
    for (let i = 0; i < 3000; i++) s += apt[torneio(apt, k, rng)];
    return s / 3000;
  };
  assert.ok(media(2) < media(4) && media(4) < media(8));
});

test('cruzamento uniforme: cada gene vem de um dos pais, e os dois aparecem', () => {
  const a = Array(N_GENES).fill(0), b = Array(N_GENES).fill(1);
  const f = cruzar(a, b, criarRng(3));
  assert.equal(f.length, N_GENES);
  assert.ok(f.every((g) => g === 0 || g === 1));
  assert.ok(f.includes(0) && f.includes(1));
});

test('mutação: taxa 0 não altera; taxa 1 altera tudo e mantém os genes em [0, 1]', () => {
  const rng = criarRng(5);
  const g = genomaAleatorio(rng);
  assert.deepEqual(mutar(g, 0, 0.2, rng), g);
  const m = mutar(g, 1, 0.8, rng);
  assert.ok(m.every((v, i) => v !== g[i]));
  for (let i = 0; i < 200; i++) for (const v of mutar(genomaAleatorio(rng), 1, 3, rng)) assert.ok(v >= 0 && v <= 1);
});

test('mutação: fração de genes alterados ~ taxa', () => {
  const rng = criarRng(6);
  let alterados = 0, total = 0;
  for (let i = 0; i < 2000; i++) {
    const g = genomaAleatorio(rng);
    const m = mutar(g, 0.1, 0.2, rng);
    m.forEach((v, j) => { alterados += v !== g[j]; total++; });
  }
  assert.ok(Math.abs(alterados / total - 0.1) < 0.01);
});

test('diversidade: 0 para clones, ~1 para população aleatória', () => {
  const rng = criarRng(7);
  const g = genomaAleatorio(rng);
  assert.equal(diversidade(Array.from({ length: 10 }, () => g.slice())), 0);
  const d = diversidade(Array.from({ length: 400 }, () => genomaAleatorio(rng)));
  assert.ok(d > 0.95 && d < 1.05, `diversidade ${d}`);
});

test('elitismo: os melhores passam intactos; sem elitismo, não há garantia', () => {
  const rng = criarRng(8);
  const pop = Array.from({ length: 20 }, () => genomaAleatorio(rng));
  const apt = pop.map((_, i) => (i * 7) % 20);
  const [i1, i2] = ordenar(apt);
  const nova = proximaGeracao(pop, apt, { elitismo: true, nElite: 2, taxaMutacao: 0.5 }, rng);
  assert.deepEqual(nova[0], pop[i1]);
  assert.deepEqual(nova[1], pop[i2]);
  assert.equal(nova.length, pop.length);
  const semElite = proximaGeracao(pop, apt, { elitismo: false, taxaMutacao: 1, sigma: 0.5 }, rng);
  assert.ok(!semElite.some((g) => g.every((v, j) => v === pop[i1][j])));
});

test('evolução é determinística: mesma semente, mesmo histórico', () => {
  const rodar = (s) => {
    const ev = new Evolucao({ semente: s, criarGenoma: genomaAleatorio, rng: criarRng(s), cfg: { tamanho: 16 } });
    for (let g = 0; g < 5; g++) ev.registrar(ev.pop.map((x) => x[0] + x[1] - x[2]));
    return ev.historico.map((h) => [h.melhor, h.media, h.diversidade]);
  };
  assert.deepEqual(rodar(11), rodar(11));
  assert.notDeepEqual(rodar(11), rodar(12));
});

test('o AG otimiza: uma função simples melhora com as gerações', () => {
  const ev = new Evolucao({ semente: 1, criarGenoma: genomaAleatorio, rng: criarRng(1), cfg: { tamanho: 30 } });
  const f = (g) => -g.reduce((s, v) => s + (v - 0.7) ** 2, 0);
  for (let i = 0; i < 40; i++) ev.registrar(ev.pop.map(f));
  assert.ok(ev.historico.at(-1).melhor > ev.historico[0].melhor + 0.5);
});
