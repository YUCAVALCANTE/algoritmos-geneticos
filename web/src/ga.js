// Algoritmo genético para genomas reais em [0, 1]: seleção por torneio,
// cruzamento uniforme, mutação gaussiana e elitismo opcional.
// Toda a aleatoriedade vem do `rng` recebido, por isso a evolução é reproduzível.
import { normal, inteiro } from './rng.js';

export const GA_PADRAO = {
  tamanho: 40,          // indivíduos por geração
  taxaMutacao: 0.05,    // probabilidade de cada gene sofrer mutação
  sigma: 0.2,           // desvio da mutação gaussiana (em unidades do gene)
  torneio: 3,           // competidores por torneio
  elitismo: true,       // copia os melhores sem alteração para a geração seguinte
  nElite: 2,
  taxaCruzamento: 0.9,  // probabilidade de o filho vir de cruzamento (senão, cópia de um pai)
};

/** Escolhe o índice do vencedor de um torneio entre `k` indivíduos sorteados (com reposição). */
export function torneio(aptidoes, k, rng) {
  let melhor = inteiro(rng, aptidoes.length);
  for (let i = 1; i < k; i++) {
    const c = inteiro(rng, aptidoes.length);
    if (aptidoes[c] > aptidoes[melhor]) melhor = c;
  }
  return melhor;
}

/** Cruzamento uniforme: cada gene vem de um dos pais com probabilidade 1/2. */
export function cruzar(a, b, rng) {
  return a.map((g, i) => (rng() < 0.5 ? g : b[i]));
}

/** Mutação gaussiana gene a gene; o valor é refletido nas bordas para ficar em [0, 1]. */
export function mutar(genoma, taxa, sigma, rng) {
  return genoma.map((g) => {
    if (rng() >= taxa) return g;
    let v = g + normal(rng) * sigma;
    while (v < 0 || v > 1) v = v < 0 ? -v : 2 - v;
    return v;
  });
}

/**
 * Diversidade da população: desvio-padrão médio dos genes, dividido pelo de uma
 * população uniforme (1/√12). Vale ~1 numa população aleatória e 0 quando todos são clones.
 */
export function diversidade(pop) {
  const n = pop.length, m = pop[0].length;
  let soma = 0;
  for (let j = 0; j < m; j++) {
    let media = 0;
    for (const g of pop) media += g[j];
    media /= n;
    let v = 0;
    for (const g of pop) v += (g[j] - media) ** 2;
    soma += Math.sqrt(v / n);
  }
  return soma / m / Math.sqrt(1 / 12);
}

/** Índices ordenados da maior para a menor aptidão (empate: menor índice primeiro). */
export function ordenar(aptidoes) {
  return aptidoes.map((_, i) => i).sort((a, b) => aptidoes[b] - aptidoes[a] || a - b);
}

/** Gera a próxima população a partir da atual e das aptidões. */
export function proximaGeracao(pop, aptidoes, cfg, rng) {
  const c = { ...GA_PADRAO, ...cfg };
  const nova = [];
  if (c.elitismo) for (const i of ordenar(aptidoes).slice(0, c.nElite)) nova.push(pop[i].slice());
  while (nova.length < pop.length) {
    const pa = pop[torneio(aptidoes, c.torneio, rng)];
    let filho;
    if (rng() < c.taxaCruzamento) filho = cruzar(pa, pop[torneio(aptidoes, c.torneio, rng)], rng);
    else filho = pa.slice();
    nova.push(mutar(filho, c.taxaMutacao, c.sigma, rng));
  }
  return nova;
}

const media = (v) => v.reduce((s, x) => s + x, 0) / v.length;

/**
 * Laço evolutivo com histórico. A avaliação fica de fora (função `avaliar` ou
 * aptidões entregues pela demo), para o mesmo código servir ao Node e ao navegador.
 */
export class Evolucao {
  constructor({ semente, criarGenoma, cfg = {}, rng }) {
    this.cfg = { ...GA_PADRAO, ...cfg };
    this.rng = rng;
    this.semente = semente;
    this.geracao = 0;
    this.pop = Array.from({ length: this.cfg.tamanho }, () => criarGenoma(this.rng));
    this.historico = [];
  }

  /** Registra as aptidões da geração atual e cria a próxima. */
  registrar(aptidoes, extras = {}) {
    const ord = ordenar(aptidoes);
    const registro = {
      geracao: this.geracao,
      melhor: aptidoes[ord[0]],
      media: media(aptidoes),
      diversidade: diversidade(this.pop),
      campeao: this.pop[ord[0]].slice(),
      ...extras,
    };
    this.historico.push(registro);
    this.pop = proximaGeracao(this.pop, aptidoes, this.cfg, this.rng);
    this.geracao++;
    return registro;
  }
}
