// Grava as poses de todos os carros de algumas gerações (semente 1, pista 1,
// configuração padrão da demo) para montar o GIF do README com experimentos/gif.py.
//
//   node experimentos/gif_dados.js   →  experimentos/brutos/gif.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { criarRng } from '../web/src/rng.js';
import { genomaAleatorio, decodificar } from '../web/src/carro.js';
import { gerarPista } from '../web/src/pista.js';
import { Corrida, APTIDOES } from '../web/src/simulacao.js';
import { Evolucao } from '../web/src/ga.js';

const GERACOES = [1, 5, 30];
const SEGUNDOS = 16, A_CADA = 4;
const pista = gerarPista(1);
const ev = new Evolucao({ semente: 1, criarGenoma: genomaAleatorio, rng: criarRng(1), cfg: { tamanho: 40 } });
const saida = { pista: pista.pontos, chegada: pista.chegada, segmentos: [] };
const r = (x) => +x.toFixed(3);

while (ev.geracao < Math.max(...GERACOES)) {
  const gravar = GERACOES.includes(ev.geracao + 1);
  const cs = ev.pop.map((g) => new Corrida(g, pista, { pararAoCapotar: true }));
  const quadros = [];
  let passo = 0, vivos = true;
  while (vivos) {
    vivos = false;
    for (const c of cs) if (c.passo()) vivos = true;
    passo++;
    if (gravar && passo % A_CADA === 0 && passo * cs[0].f.dt <= SEGUNDOS) {
      quadros.push(cs.map((c) => {
        const p = c.carroceria.getPosition();
        return [r(p.x), r(p.y), r(c.carroceria.getAngle()), c.terminou ? 1 : 0, ...c.rodas.map((w) => r(w.getAngle()))];
      }));
    }
  }
  const apt = cs.map((c) => APTIDOES.robusta(c.resultado()));
  if (gravar) saida.segmentos.push({ geracao: ev.geracao + 1, formas: ev.pop.map(decodificar), quadros, melhor: Math.max(...apt) });
  ev.registrar(apt);
  console.log(`geração ${ev.geracao}: melhor ${Math.max(...apt).toFixed(1)}`);
}
mkdirSync('experimentos/brutos', { recursive: true });
writeFileSync('experimentos/brutos/gif.json', JSON.stringify(saida));
