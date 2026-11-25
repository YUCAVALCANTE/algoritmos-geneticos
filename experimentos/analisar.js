// Lê as execuções salvas, examina os campeões (inclusive em pistas nunca vistas)
// e escreve experimentos/resultados/resumo.json, que alimenta os gráficos e a página.
//
//   node experimentos/analisar.js
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PROTOCOLO, lerExecucao } from './rodar.js';
import { examinar } from './nucleo.js';
import { Corrida } from '../web/src/simulacao.js';
import { gerarPista } from '../web/src/pista.js';
import { decodificar } from '../web/src/carro.js';
import { avaliar } from '../web/src/simulacao.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const S = PROTOCOLO.sementes;
const PISTAS_TESTE = Array.from({ length: 10 }, (_, i) => 101 + i);
const media = (v) => v.reduce((a, b) => a + b, 0) / v.length;
const arred = (x, n = 2) => (x == null ? null : +x.toFixed(n));

// ---------- 1. aptidão mal formulada ----------
function trajetoria(genoma, idPista, a_cada = 6) {
  const c = new Corrida(genoma, gerarPista(idPista));
  const quadros = [];
  let k = 0;
  do {
    if (k++ % a_cada === 0) {
      const p = c.carroceria.getPosition();
      quadros.push([arred(c.tempo), arred(p.x, 3), arred(p.y, 3), arred(c.carroceria.getAngle(), 4), c.capotou ? 1 : 0]);
    }
  } while (c.passo());
  const p = c.carroceria.getPosition();
  quadros.push([arred(c.tempo), arred(p.x, 3), arred(p.y, 3), arred(c.carroceria.getAngle(), 4), c.capotou ? 1 : 0]);
  return { forma: decodificar(genoma), quadros };
}

const e1 = { sementes: S, ingenua: [], robusta: [] };
for (const s of S) {
  for (const tipo of ['ingenua', 'robusta']) {
    const id = tipo === 'ingenua' ? `ag_ing_m0.05_e1_s${s}` : `ag_rob_m0.05_e1_s${s}`;
    const ex = lerExecucao(id);
    const r = examinar(ex.resultado.campeao, 1);
    e1[tipo].push({ semente: s, ingenua: arred(r.ingenua), robusta: arred(r.robusta), capotou: r.capotou, xCapotou: arred(r.xCapotou), tempo: arred(r.tempo), motivo: r.motivo, campeao: ex.resultado.campeao });
  }
}
// carro ilustrativo: o campeão ingênuo com a maior distância percorrida depois de capotar
const exemplo = e1.ingenua.filter((x) => x.capotou).sort((a, b) => (b.ingenua - b.xCapotou) - (a.ingenua - a.xCapotou))[0] || e1.ingenua[0];
e1.exemplo = { semente: exemplo.semente, ingenuo: trajetoria(exemplo.campeao, 1), robusto: trajetoria(e1.robusta.find((x) => x.semente === exemplo.semente).campeao, 1) };

// ---------- 2. convergência prematura ----------
const e2 = { taxas: PROTOCOLO.taxas, configs: [] };
for (const m of PROTOCOLO.taxas) for (const e of [1, 0]) {
  const exs = S.map((s) => lerExecucao(`ag_rob_m${m}_e${e}_s${s}`).resultado);
  e2.configs.push({
    taxa: m, elitismo: !!e,
    melhorFinal: exs.map((x) => arred(x.melhor)),
    diversidade: exs.map((x) => x.historico.map((h) => arred(h.diversidade, 3))),
    melhorPorGeracao: exs.map((x) => x.historico.map((h) => arred(h.melhor))),
    mediaPorGeracao: exs.map((x) => x.historico.map((h) => arred(h.media))),
  });
}

// ---------- 3. generalização ----------
const naPista = (g, id) => avaliar(g, gerarPista(id), 'robusta').aptidao;
const e3 = { pistasTeste: PISTAS_TESTE, pistaUnica: [], multiplas: [] };
for (const s of S) {
  for (const [chave, id, treino] of [['pistaUnica', `ag_rob_m0.05_e1_s${s}`, PROTOCOLO.pistaTreino], ['multiplas', `ag_multi_m0.05_e1_s${s}`, PROTOCOLO.pistasMulti]]) {
    const g = lerExecucao(id).resultado.campeao;
    const teste = PISTAS_TESTE.map((p) => arred(naPista(g, p)));
    e3[chave].push({ semente: s, treino: arred(media(treino.map((p) => naPista(g, p)))), pista1: arred(naPista(g, 1)), teste, mediaTeste: arred(media(teste)) });
  }
}
// referência: o que um carro aleatório faz nas pistas de teste (melhor de 40)
e3.chegada = PISTAS_TESTE.map((p) => arred(gerarPista(p).chegada));

// ---------- 4. linhas de base ----------
const e4 = { avaliacoes: PROTOCOLO.geracoes * PROTOCOLO.tamanho, metodos: {} };
for (const [nome, prefixo] of [['ag', 'ag_rob_m0.05_e1_s'], ['aleatoria', 'aleatoria_s'], ['hill', 'hill_s']]) {
  const exs = S.map((s) => lerExecucao(`${prefixo}${s}`).resultado);
  e4.metodos[nome] = { curvas: exs.map((x) => x.curva.map((v) => arred(v))), final: exs.map((x) => arred(x.melhor)) };
}

const resumo = { protocolo: PROTOCOLO, e1, e2, e3, e4 };
mkdirSync(join(AQUI, 'resultados'), { recursive: true });
writeFileSync(join(AQUI, 'resultados', 'resumo.json'), JSON.stringify(resumo));

// tabela rápida no terminal
const fmt = (v) => v.map((x) => x.toFixed(0)).join(' ');
console.log('1) aptidão  ingênua → (ingênua, robusta):', e1.ingenua.map((x) => `${x.ingenua.toFixed(0)}/${x.robusta.toFixed(0)}${x.capotou ? 'c' : ''}`).join('  '));
console.log('            robusta → (ingênua, robusta):', e1.robusta.map((x) => `${x.ingenua.toFixed(0)}/${x.robusta.toFixed(0)}${x.capotou ? 'c' : ''}`).join('  '));
for (const c of e2.configs) console.log(`2) mut ${c.taxa} elite ${c.elitismo ? 'sim' : 'não'}: final ${fmt(c.melhorFinal)} | média ${media(c.melhorFinal).toFixed(0)} | div final ${media(c.diversidade.map((d) => d.at(-1))).toFixed(2)}`);
for (const k of ['pistaUnica', 'multiplas']) console.log(`3) ${k}: treino ${fmt(e3[k].map((x) => x.treino))} | teste ${fmt(e3[k].map((x) => x.mediaTeste))}`);
for (const [k, v] of Object.entries(e4.metodos)) console.log(`4) ${k}: ${fmt(v.final)} | média ${media(v.final).toFixed(0)}`);
