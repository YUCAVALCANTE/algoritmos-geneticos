// Roda todos os experimentos em paralelo (worker_threads) e guarda cada execução em
// experimentos/resultados/execucoes/<id>.json. Execuções já salvas são puladas,
// então dá para interromper e continuar.
//
//   node experimentos/rodar.js            # tudo (~30 min em 8 núcleos)
//   node experimentos/rodar.js --rapido   # teste de fumaça: 2 gerações, sem salvar
//   node experimentos/rodar.js --threads 4
import { Worker } from 'node:worker_threads';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const rapido = args.includes('--rapido');
const nThreads = +(args[args.indexOf('--threads') + 1] || 0) || Math.max(1, cpus().length - 1);

export const PROTOCOLO = {
  geracoes: rapido ? 2 : 30,
  tamanho: rapido ? 8 : 40,
  sementes: rapido ? [1] : [1, 2, 3, 4, 5],
  pistaTreino: [1],
  pistasMulti: [1, 2, 3],
  taxas: rapido ? [0.05] : [0.01, 0.05, 0.15, 0.3],
};

export function tarefas(P = PROTOCOLO) {
  const t = [];
  const avaliacoes = P.geracoes * P.tamanho;
  const ag = (id, extra) => t.push({ id, metodo: 'ag', args: { geracoes: P.geracoes, pistasTreino: P.pistaTreino, ...extra, cfg: { tamanho: P.tamanho, ...extra.cfg } } });
  for (const s of P.sementes) {
    for (const m of P.taxas) for (const e of [1, 0]) {
      ag(`ag_rob_m${m}_e${e}_s${s}`, { semente: s, aptidao: 'robusta', cfg: { taxaMutacao: m, elitismo: !!e } });
    }
    ag(`ag_ing_m0.05_e1_s${s}`, { semente: s, aptidao: 'ingenua', cfg: { taxaMutacao: 0.05, elitismo: true } });
    ag(`ag_multi_m0.05_e1_s${s}`, { semente: s, aptidao: 'robusta', pistasTreino: P.pistasMulti, cfg: { taxaMutacao: 0.05, elitismo: true } });
    t.push({ id: `aleatoria_s${s}`, metodo: 'aleatoria', args: { semente: s, pistasTreino: P.pistaTreino, avaliacoes } });
    t.push({ id: `hill_s${s}`, metodo: 'hill', args: { semente: s, pistasTreino: P.pistaTreino, avaliacoes } });
  }
  return t;
}

async function principal() {
  const dir = join(AQUI, 'resultados', 'execucoes');
  if (!rapido) mkdirSync(dir, { recursive: true });
  // as mais caras primeiro (várias pistas, aptidão ingênua), para o fim não ficar com uma thread só
  const peso = (x) => (x.id.includes('multi') ? 3 : x.id.includes('_ing_') ? 2 : 1);
  const fila = tarefas().filter((x) => rapido || !existsSync(join(dir, `${x.id}.json`))).sort((a, b) => peso(b) - peso(a));
  const total = fila.length;
  console.log(`${total} execuções a rodar em ${nThreads} threads${rapido ? ' (modo rápido)' : ''}`);
  const t0 = Date.now();
  let feitas = 0;
  await Promise.all(Array.from({ length: Math.min(nThreads, total) }, () => new Promise((ok, erro) => {
    const w = new Worker(join(AQUI, 'trabalhador.js'));
    const proxima = () => {
      const tarefa = fila.shift();
      if (!tarefa) { w.terminate(); ok(); return; }
      w.postMessage(tarefa);
      w.once('message', ({ id, r }) => {
        feitas++;
        const resumo = `melhor ${r.melhor.toFixed(1)} · ${r.segundos.toFixed(0)} s`;
        console.log(`[${feitas}/${total}] ${id}: ${resumo} · ${((Date.now() - t0) / 60000).toFixed(1)} min`);
        if (!rapido) writeFileSync(join(dir, `${id}.json`), JSON.stringify({ ...tarefa, resultado: r }));
        proxima();
      });
    };
    w.on('error', erro);
    proxima();
  })));
  console.log(`pronto em ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) principal();
export const lerExecucao = (id) => JSON.parse(readFileSync(join(AQUI, 'resultados', 'execucoes', `${id}.json`), 'utf8'));
