import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarRng } from '../web/src/rng.js';
import { aptidaoTexto, criarPopulacaoTexto, proximaGeracaoTexto } from '../web/src/revoada.js';

test('aptidão do texto conta letras na posição certa', () => {
  assert.equal(aptidaoTexto('REVOADA', 'REVOADA'), 7);
  assert.equal(aptidaoTexto('RXVXAXA', 'REVOADA'), 4);
  assert.equal(aptidaoTexto('XXXXXXX', 'REVOADA'), 0);
});

test('REVOADA: a população chega à palavra em poucas gerações', () => {
  const rng = criarRng('revoada:1');
  let pop = criarPopulacaoTexto('REVOADA', 150, rng);
  let g = 0;
  while (!pop.includes('REVOADA') && g < 300) { pop = proximaGeracaoTexto(pop, 'REVOADA', {}, rng); g++; }
  assert.ok(g < 300, `não chegou em 300 gerações`);
});
