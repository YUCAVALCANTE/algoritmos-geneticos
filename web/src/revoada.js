// O exemplo do artigo em 30 segundos: frases aleatórias evoluem até a palavra-alvo.
// Aptidão = número de letras na posição certa.
import { inteiro } from './rng.js';
import { torneio, ordenar } from './ga.js';

export const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const aptidaoTexto = (s, alvo) => [...s].reduce((n, ch, i) => n + (ch === alvo[i]), 0);

const letra = (rng) => ALFABETO[inteiro(rng, ALFABETO.length)];

export function criarPopulacaoTexto(alvo, tamanho, rng) {
  return Array.from({ length: tamanho }, () => Array.from(alvo, () => letra(rng)).join(''));
}

/** Uma geração: elitismo de 1, torneio de 5, cruzamento de um ponto, mutação por letra. */
export function proximaGeracaoTexto(pop, alvo, { taxaMutacao = 0.05, torneioK = 5 } = {}, rng) {
  const apt = pop.map((s) => aptidaoTexto(s, alvo));
  const nova = [pop[ordenar(apt)[0]]];
  while (nova.length < pop.length) {
    const a = pop[torneio(apt, torneioK, rng)], b = pop[torneio(apt, torneioK, rng)];
    const corte = 1 + inteiro(rng, alvo.length - 1);
    const filho = [...(a.slice(0, corte) + b.slice(corte))].map((ch) => (rng() < taxaMutacao ? letra(rng) : ch));
    nova.push(filho.join(''));
  }
  return nova;
}
