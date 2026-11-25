import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarRng } from '../web/src/rng.js';
import { genomaAleatorio } from '../web/src/carro.js';
import { gerarPista } from '../web/src/pista.js';
import { Corrida, correr, avaliar } from '../web/src/simulacao.js';
import * as dmath from '../web/src/dmath.js';

const pista = gerarPista(1);
const pop = (() => { const r = criarRng(1); return Array.from({ length: 40 }, () => genomaAleatorio(r)); })();

test('dmath: sin, cos, atan2 e log batem com Math até 1e-14', () => {
  for (let i = -5000; i <= 5000; i++) {
    const x = i * 0.0137;
    assert.ok(Math.abs(dmath.sin(x) - Math.sin(x)) < 1e-14);
    assert.ok(Math.abs(dmath.cos(x) - Math.cos(x)) < 1e-14);
    assert.ok(Math.abs(dmath.atan2(x, 1 - x / 3) - Math.atan2(x, 1 - x / 3)) < 1e-14);
    if (x > 0) assert.ok(Math.abs(dmath.log(x) - Math.log(x)) < 1e-14);
  }
});

test('pista: mesma semente, mesma pista; outra semente, outra pista', () => {
  assert.deepEqual(gerarPista(3).pontos, gerarPista(3).pontos);
  assert.notDeepEqual(gerarPista(3).pontos, gerarPista(4).pontos);
});

test('corrida: o mesmo carro dá o mesmo resultado, bit a bit', () => {
  const a = correr(pop[3], pista), b = correr(pop[3], pista);
  assert.deepEqual(a, b);
});

test('corrida: avaliar em lote (Node) = avançar todos juntos em lockstep (demo)', () => {
  const amostra = pop.slice(0, 8);
  const sozinhos = amostra.map((g) => correr(g, pista, { pararAoCapotar: true }).maxX);
  const juntos = amostra.map((g) => new Corrida(g, pista, { pararAoCapotar: true }));
  let vivos = true;
  while (vivos) { vivos = false; for (const c of juntos) if (c.passo()) vivos = true; }
  assert.deepEqual(juntos.map((c) => c.maxX), sozinhos);
});

test('corrida: resultado não depende da ordem de avaliação', () => {
  const ida = pop.slice(0, 6).map((g) => avaliar(g, pista).aptidao);
  const volta = pop.slice(0, 6).reverse().map((g) => avaliar(g, pista).aptidao).reverse();
  assert.deepEqual(ida, volta);
});

test('valor de referência: o mesmo número em qualquer máquina e no navegador', () => {
  // Medido no Node 24 (Windows) e no Chromium: geração 0 da semente 1 na pista 1.
  const apt = pop.map((g) => avaliar(g, pista, 'robusta').aptidao);
  assert.equal(Math.max(...apt), 81.28788015352924);
  assert.equal(apt.reduce((s, x) => s + x, 0), 703.1101031583797);
});
