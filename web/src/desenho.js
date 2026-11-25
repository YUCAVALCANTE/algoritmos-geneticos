// Desenho da pista e dos carros num canvas. Só lê o estado da física; não altera nada.
import { decodificar } from './carro.js';

function cores() {
  const s = getComputedStyle(document.documentElement);
  const v = (n) => s.getPropertyValue(n).trim();
  const escuro = s.colorScheme === 'dark' || v('--panel') === '#1c1c1e';
  return {
    ceu: v('--fill'), chao: v('--accent-2'), borda: v('--accent-3'), acento: v('--accent'),
    tinta: v('--ink'), apagado: v('--muted'), painel: v('--panel'),
    roda: escuro ? '#d1d1d6' : '#3a3a3c', cubo: escuro ? '#1c1c1e' : '#f2f2f7',
    outro: escuro ? 'rgba(174,174,178,' : 'rgba(99,99,102,',
  };
}

export class Desenho {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 2 };
    this.atualizarCores();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.atualizarCores());
    new ResizeObserver(() => this.redimensionar()).observe(canvas);
    this.redimensionar();
  }

  atualizarCores() { this.c = cores(); }

  redimensionar() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.dpr = dpr;
  }

  /** Move a câmera suavemente até o ponto (x, y) em metros. */
  seguir(x, y, instantaneo = false) {
    const k = instantaneo ? 1 : 0.08;
    this.cam.x += (x - this.cam.x) * k;
    this.cam.y += (y - this.cam.y) * k;
  }

  desenhar({ pista, corridas, lider, recorde, destaque = -1 }) {
    const { ctx, canvas, c } = this;
    const W = canvas.width, H = canvas.height;
    const esc = H / 13; // pixels por metro: ~13 m visíveis na vertical
    const ox = W * 0.38 - this.cam.x * esc, oy = H * 0.58 + this.cam.y * esc;
    const X = (x) => ox + x * esc, Y = (y) => oy - y * esc;
    const xMin = (0 - ox) / esc - 2, xMax = (W - ox) / esc + 2;

    ctx.fillStyle = c.ceu;
    ctx.fillRect(0, 0, W, H);

    ctx.font = `${12 * this.dpr}px -apple-system, "Segoe UI", sans-serif`;

    // chão
    const pts = pista.pontos;
    ctx.beginPath();
    let primeiro = true, ultimoX = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      const prox = pts[i + 1];
      if (prox && prox[0] < xMin) continue;
      if (primeiro) { ctx.moveTo(X(x), H); ctx.lineTo(X(x), Y(y)); primeiro = false; } else ctx.lineTo(X(x), Y(y));
      ultimoX = x;
      if (x > xMax) break;
    }
    ctx.lineTo(X(ultimoX), H);
    ctx.closePath();
    ctx.fillStyle = c.chao;
    ctx.fill();
    ctx.lineWidth = 2 * this.dpr;
    ctx.strokeStyle = c.borda;
    ctx.beginPath();
    primeiro = true;
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      const prox = pts[i + 1];
      if (prox && prox[0] < xMin) continue;
      if (primeiro) { ctx.moveTo(X(x), Y(y)); primeiro = false; } else ctx.lineTo(X(x), Y(y));
      if (x > xMax) break;
    }
    ctx.stroke();

    // marcos de distância, gravados no chão
    ctx.textAlign = 'center';
    for (let m = Math.ceil(xMin / 25) * 25; m <= xMax; m += 25) {
      if (m < 0 || m > pista.chegada) continue;
      const yy = Y(alturaEm(pista, m));
      ctx.fillStyle = c.borda;
      ctx.fillRect(X(m) - 0.75 * this.dpr, yy, 1.5 * this.dpr, 8 * this.dpr);
      ctx.fillStyle = c.tinta;
      ctx.globalAlpha = 0.55;
      ctx.fillText(`${m} m`, X(m), yy + 22 * this.dpr);
      ctx.globalAlpha = 1;
    }

    // chegada: poste com bandeira quadriculada
    const yc = alturaEm(pista, pista.chegada);
    if (pista.chegada > xMin && pista.chegada < xMax) {
      const px = X(pista.chegada), base = Y(yc), topo = Y(yc + 4);
      ctx.fillStyle = c.tinta;
      ctx.fillRect(px - this.dpr, topo, 2 * this.dpr, base - topo);
      const q = 0.35 * esc;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
        ctx.fillStyle = (i + j) % 2 ? c.painel : c.tinta;
        ctx.fillRect(px + i * q, topo + j * q, q, q);
      }
    }

    // recorde (melhor distância das gerações anteriores)
    if (recorde > 0 && recorde > xMin && recorde < xMax) {
      ctx.save();
      ctx.setLineDash([6 * this.dpr, 6 * this.dpr]);
      ctx.strokeStyle = c.acento;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1.5 * this.dpr;
      ctx.beginPath();
      ctx.moveTo(X(recorde), 34 * this.dpr);
      ctx.lineTo(X(recorde), H);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = c.acento;
      ctx.textAlign = 'left';
      ctx.fillText('recorde', X(recorde) + 6 * this.dpr, 46 * this.dpr);
    }

    // carros: primeiro os outros, depois o líder por cima
    const ordem = corridas.map((_, i) => i).filter((i) => i !== lider);
    if (lider >= 0) ordem.push(lider);
    for (const i of ordem) {
      const cor = corridas[i];
      const p = cor.carroceria.getPosition();
      if (p.x < xMin - 4 || p.x > xMax + 4) continue;
      const ehLider = i === lider || i === destaque;
      const alfa = cor.terminou ? 0.18 : 1;
      desenharCarro(ctx, cor, X, Y, esc, c, ehLider, alfa);
    }
  }
}

function alturaEm(pista, x) {
  const p = pista.pontos;
  for (let i = 1; i < p.length; i++) if (p[i][0] >= x) {
    const [x0, y0] = p[i - 1], [x1, y1] = p[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
  }
  return p[p.length - 1][1];
}

function desenharCarro(ctx, corrida, X, Y, esc, c, destaque, alfa) {
  const corpo = corrida.carroceria;
  const pos = corpo.getPosition(), ang = corpo.getAngle();
  const cs = Math.cos(ang), sn = Math.sin(ang);
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.beginPath();
  corrida.forma.vertices.forEach(([vx, vy], k) => {
    const x = pos.x + vx * cs - vy * sn, y = pos.y + vx * sn + vy * cs;
    if (k) ctx.lineTo(X(x), Y(y)); else ctx.moveTo(X(x), Y(y));
  });
  ctx.closePath();
  ctx.fillStyle = destaque ? c.acento : `${c.outro}.22)`;
  ctx.fill();
  ctx.lineWidth = Math.max(1, esc * 0.04);
  ctx.strokeStyle = destaque ? c.acento : `${c.outro}.55)`;
  ctx.stroke();
  corrida.rodas.forEach((roda, k) => {
    const p = roda.getPosition(), a = roda.getAngle();
    const r = corrida.forma.rodas[k].raio;
    ctx.beginPath();
    ctx.arc(X(p.x), Y(p.y), r * esc, 0, Math.PI * 2);
    ctx.fillStyle = destaque ? c.roda : `${c.outro}.35)`;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(X(p.x), Y(p.y));
    ctx.lineTo(X(p.x + Math.cos(a) * r * 0.8), Y(p.y + Math.sin(a) * r * 0.8));
    ctx.strokeStyle = destaque ? c.cubo : `${c.outro}.6)`;
    ctx.lineWidth = Math.max(1, r * esc * 0.18);
    ctx.stroke();
  });
  ctx.restore();
}

/** Desenha um genoma parado (para a galeria de campeões). */
export function desenharMiniatura(canvas, genoma) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.round((r.width || 96) * dpr);
  canvas.height = Math.round((r.height || 64) * dpr);
  const ctx = canvas.getContext('2d');
  const c = cores();
  const f = decodificar(genoma);
  const pts = [...f.vertices];
  const circ = f.rodas.map((rd) => [...f.vertices[rd.vertice], rd.raio]);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (const [x, y, rr] of circ) { x0 = Math.min(x0, x - rr); x1 = Math.max(x1, x + rr); y0 = Math.min(y0, y - rr); y1 = Math.max(y1, y + rr); }
  const W = canvas.width, H = canvas.height;
  const esc = Math.min((W * 0.9) / (x1 - x0), (H * 0.9) / (y1 - y0));
  const X = (x) => W / 2 + (x - (x0 + x1) / 2) * esc, Y = (y) => H / 2 - (y - (y0 + y1) / 2) * esc;
  ctx.clearRect(0, 0, W, H);
  ctx.beginPath();
  pts.forEach(([x, y], k) => (k ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
  ctx.closePath();
  ctx.fillStyle = c.acento;
  ctx.fill();
  for (const [x, y, rr] of circ) {
    ctx.beginPath();
    ctx.arc(X(x), Y(y), rr * esc, 0, Math.PI * 2);
    ctx.fillStyle = c.roda;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(X(x), Y(y), rr * esc * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = c.cubo;
    ctx.fill();
  }
}
