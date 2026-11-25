// Executa uma tarefa de experimento numa thread separada.
import { parentPort } from 'node:worker_threads';
import { rodarAG, buscaAleatoria, hillClimbing } from './nucleo.js';

const metodos = { ag: rodarAG, aleatoria: buscaAleatoria, hill: hillClimbing };

parentPort.on('message', ({ id, metodo, args }) => {
  const t0 = performance.now();
  const r = metodos[metodo](args);
  parentPort.postMessage({ id, r: { ...r, segundos: (performance.now() - t0) / 1000 } });
});
