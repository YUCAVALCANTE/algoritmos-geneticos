// Gráfico de linhas em SVG com cruz de leitura e dica ao passar o mouse.
// Um eixo só; séries com legenda e rótulo direto no último ponto.
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, pai) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (pai) pai.appendChild(e);
  return e;
};

function passoBonito(max, n = 4) {
  const bruto = max / n;
  const p = 10 ** Math.floor(Math.log10(bruto || 1));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= bruto) return m * p;
  return 10 * p;
}

/**
 * Cria um gráfico dentro de `container`. Devolve { atualizar(series) }.
 * series: [{ nome, cor, valores: number[] }]; opcoes: { yMax, formato, rotuloX }
 */
export function criarGrafico(container, opcoes = {}) {
  const W = 520, H = 220, m = { e: 40, d: 64, t: 12, b: 28 };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opcoes.titulo || 'gráfico' });
  container.appendChild(svg);
  const dica = document.createElement('div');
  dica.className = 'tooltip';
  container.appendChild(dica);
  const fmt = opcoes.formato || ((v) => v.toFixed(1));
  let series = [];

  function desenhar() {
    svg.replaceChildren();
    const n = Math.max(1, ...series.map((s) => s.valores.length));
    const yMaxDados = Math.max(1e-9, ...series.flatMap((s) => s.valores));
    const yMax = opcoes.yMax ?? yMaxDados * 1.08;
    const passo = passoBonito(yMax);
    const topo = opcoes.yMax ?? Math.ceil(yMax / passo) * passo;
    const X = (i) => m.e + (n <= 1 ? 0 : (i / (n - 1)) * (W - m.e - m.d));
    const Y = (v) => H - m.b - (v / topo) * (H - m.t - m.b);
    for (let v = 0; v <= topo + 1e-9; v += passo) {
      el('line', { x1: m.e, x2: W - m.d, y1: Y(v), y2: Y(v), class: v === 0 ? 'eixo' : 'grade-l' }, svg);
      el('text', { x: m.e - 6, y: Y(v) + 4, 'text-anchor': 'end' }, svg).textContent = fmt(v, true);
    }
    const passoX = Math.max(1, Math.ceil(n / 6));
    for (let i = 0; i < n; i += passoX) el('text', { x: X(i), y: H - 8, 'text-anchor': 'middle' }, svg).textContent = i + 1;
    el('text', { x: W - m.d, y: H - 8, 'text-anchor': 'end' }, svg).textContent = '';
    if (!series.length || !series[0].valores.length) return;
    for (const s of series) {
      const d = s.valores.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
      el('path', { d, fill: 'none', stroke: s.cor, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      const u = s.valores.length - 1;
      el('circle', { cx: X(u), cy: Y(s.valores[u]), r: 3.5, fill: s.cor }, svg);
    }
    // rótulos diretos no fim, afastados se colidirem
    const fins = series.map((s) => ({ s, y: Y(s.valores[s.valores.length - 1]) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < fins.length; i++) if (fins[i].y - fins[i - 1].y < 13) fins[i].y = fins[i - 1].y + 13;
    for (const f of fins) {
      const u = f.s.valores.length - 1;
      el('text', { x: X(u) + 8, y: f.y + 4, class: 'forte' }, svg).textContent = `${f.s.nome} ${fmt(f.s.valores[u])}`;
    }
    const cruz = el('line', { y1: m.t, y2: H - m.b, stroke: 'currentColor', 'stroke-opacity': 0.3, visibility: 'hidden' }, svg);
    const alvo = el('rect', { x: m.e, y: 0, width: W - m.e - m.d, height: H, fill: 'transparent' }, svg);
    const mover = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(n - 1, Math.round(((px - m.e) / (W - m.e - m.d)) * (n - 1))));
      cruz.setAttribute('x1', X(i)); cruz.setAttribute('x2', X(i)); cruz.setAttribute('visibility', 'visible');
      dica.innerHTML = `<b>Geração ${i + 1}</b><br>` + series.map((s) => `<i style="background:${s.cor}"></i>${s.nome}: ${fmt(s.valores[i] ?? NaN)}`).join('<br>');
      dica.style.display = 'block';
      const cr = container.getBoundingClientRect();
      const left = (X(i) / W) * r.width + (r.left - cr.left);
      dica.style.left = `${Math.min(left + 12, cr.width - dica.offsetWidth - 4)}px`;
      dica.style.top = `${r.top - cr.top + 8}px`;
    };
    alvo.addEventListener('pointermove', mover);
    alvo.addEventListener('pointerleave', () => { dica.style.display = 'none'; cruz.setAttribute('visibility', 'hidden'); });
  }

  desenhar();
  return { atualizar(s) { series = s; desenhar(); } };
}
