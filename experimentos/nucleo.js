// Os três otimizadores comparados nos experimentos, todos com o mesmo
// orçamento de avaliações e o mesmo código de física da demo.
import { criarRng, normal } from '../web/src/rng.js';
import { genomaAleatorio } from '../web/src/carro.js';
import { gerarPista } from '../web/src/pista.js';
import { avaliar, correr, APTIDOES } from '../web/src/simulacao.js';
import { Evolucao, GA_PADRAO } from '../web/src/ga.js';

export const pistas = (ids) => ids.map((i) => gerarPista(i));

/** Algoritmo genético. Devolve histórico por geração e a curva melhor-até-agora por avaliação. */
export function rodarAG({ semente, pistasTreino, aptidao = 'robusta', cfg = {}, geracoes = 30 }) {
  const ps = pistas(pistasTreino);
  const ev = new Evolucao({ semente, criarGenoma: genomaAleatorio, rng: criarRng(semente), cfg: { ...GA_PADRAO, ...cfg } });
  const curva = [];
  let melhorAteAgora = -Infinity, campeao = null;
  for (let g = 0; g < geracoes; g++) {
    const apt = ev.pop.map((x) => avaliar(x, ps, aptidao).aptidao);
    apt.forEach((a, i) => {
      if (a > melhorAteAgora) { melhorAteAgora = a; campeao = ev.pop[i].slice(); }
      curva.push(melhorAteAgora);
    });
    ev.registrar(apt);
  }
  return {
    historico: ev.historico.map(({ melhor, media, diversidade }) => ({ melhor, media, diversidade })),
    curva: amostrar(curva), campeao, melhor: melhorAteAgora, avaliacoes: curva.length,
  };
}

/** Busca aleatória: sorteia genomas independentes e guarda o melhor. */
export function buscaAleatoria({ semente, pistasTreino, aptidao = 'robusta', avaliacoes }) {
  const ps = pistas(pistasTreino);
  const rng = criarRng(`aleatoria:${semente}`);
  const curva = [];
  let melhor = -Infinity, campeao = null;
  for (let i = 0; i < avaliacoes; i++) {
    const g = genomaAleatorio(rng);
    const a = avaliar(g, ps, aptidao).aptidao;
    if (a > melhor) { melhor = a; campeao = g; }
    curva.push(melhor);
  }
  return { curva: amostrar(curva), campeao, melhor, avaliacoes };
}

/** Hill climbing (1+1): muta o atual e fica com o vizinho se ele não for pior. */
export function hillClimbing({ semente, pistasTreino, aptidao = 'robusta', avaliacoes, taxa = 0.2, sigma = 0.15 }) {
  const ps = pistas(pistasTreino);
  const rng = criarRng(`hill:${semente}`);
  let atual = genomaAleatorio(rng);
  let aAtual = avaliar(atual, ps, aptidao).aptidao;
  const curva = [aAtual];
  while (curva.length < avaliacoes) {
    const j = Math.floor(rng() * atual.length); // garante ao menos um gene alterado
    const viz = atual.map((g, i) => {
      if (i !== j && rng() >= taxa) return g;
      let v = g + normal(rng) * sigma;
      while (v < 0 || v > 1) v = v < 0 ? -v : 2 - v;
      return v;
    });
    const a = avaliar(viz, ps, aptidao).aptidao;
    if (a >= aAtual) { atual = viz; aAtual = a; }
    curva.push(aAtual);
  }
  return { curva: amostrar(curva), campeao: atual, melhor: aAtual, avaliacoes };
}

// guarda 1 ponto a cada 20 avaliações (e o último), para os arquivos ficarem pequenos
function amostrar(curva) {
  const out = [];
  for (let i = 19; i < curva.length; i += 20) out.push(curva[i]);
  if (curva.length % 20) out.push(curva[curva.length - 1]);
  return out;
}

/** Corrida completa (sem parar ao capotar) com as duas aptidões e o motivo do fim. */
export function examinar(genoma, idPista) {
  const r = correr(genoma, gerarPista(idPista));
  return { ...r, ingenua: APTIDOES.ingenua(r), robusta: APTIDOES.robusta(r) };
}
