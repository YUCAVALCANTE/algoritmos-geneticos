// Pista 2D gerada por semente: um trecho plano de largada e depois uma sequência
// de segmentos cuja inclinação segue um passeio aleatório suavizado. A dificuldade
// (amplitude das inclinações e frequência de "degraus") cresce ao longo do percurso.
import { criarRng } from './rng.js';
import { sin, cos } from './dmath.js';

export const PISTA_PADRAO = {
  segmento: 1.0,        // comprimento de cada segmento (m)
  segmentos: 320,       // ~280 m de pista depois da largada
  largada: 10,          // trecho plano inicial (m)
  ampInicial: 0.15,     // inclinação máxima no começo (rad)
  ampFinal: 1.5,        // inclinação máxima no fim (rad)
  suavidade: 0.3,       // peso da inclinação anterior (0 = serrilhado, 1 = reto)
};

/**
 * Gera os pontos (x, y) do chão. Retorna { pontos, chegada, semente }.
 * `chegada` é o x da linha de chegada.
 */
export function gerarPista(semente, opcoes = {}) {
  const o = { ...PISTA_PADRAO, ...opcoes };
  const rng = criarRng(`pista:${semente}`);
  const pontos = [[-6, 0], [o.largada, 0]];
  let x = o.largada, y = 0, ang = 0;
  for (let k = 0; k < o.segmentos; k++) {
    const prog = k / (o.segmentos - 1);
    const amp = o.ampInicial + (o.ampFinal - o.ampInicial) * prog;
    const alvo = (rng() * 2 - 1) * amp;
    ang = o.suavidade * ang + (1 - o.suavidade) * alvo * 1.6;
    ang = Math.max(-amp, Math.min(amp, ang));
    x += o.segmento * cos(ang);
    y += o.segmento * sin(ang);
    pontos.push([x, y]);
  }
  const chegada = x;
  pontos.push([x + 12, y], [x + 12, y + 8]); // reta final e muro
  return { pontos, chegada, semente };
}
