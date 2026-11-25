// Demo: a geração inteira corre ao mesmo tempo na tela. Cada carro tem o próprio
// mundo físico, avançado em lockstep; quando todos terminam, o AG cria a próxima geração.
import { criarRng } from './rng.js';
import { genomaAleatorio } from './carro.js';
import { gerarPista } from './pista.js';
import { Corrida, APTIDOES } from './simulacao.js';
import { Evolucao, GA_PADRAO } from './ga.js';
import { Desenho, desenharMiniatura } from './desenho.js';
import { criarGrafico } from './grafico.js';

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const num = (k, d) => (q.has(k) && Number.isFinite(+q.get(k)) ? +q.get(k) : d);

const cfg = {
  tamanho: num('pop', 40),
  taxaMutacao: num('mut', GA_PADRAO.taxaMutacao),
  torneio: num('torneio', GA_PADRAO.torneio),
  elitismo: q.get('elite') !== '0',
};
let semente = num('semente', 1), nPista = num('pista', 1);
let aptidao = q.get('aptidao') === 'ingenua' ? 'ingenua' : 'robusta';
let velocidade = '2', pausado = false;

let pista, ev, corridas, reprise = null, recorde = 0, recordeX = 0;
const desenho = new Desenho($('pista'));
const corSerie = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
const gApt = criarGrafico($('gAptidao'), { titulo: 'Aptidão por geração', formato: (v) => `${Math.round(v)}` });
const gDiv = criarGrafico($('gDiversidade'), { titulo: 'Diversidade por geração', yMax: 1, formato: (v) => v.toFixed(2) });

// ---------- controles ----------
function ligarFaixa(id, chave, fmt) {
  const inp = $(id), out = $(`o${id[0].toUpperCase()}${id.slice(1)}`);
  inp.value = cfg[chave];
  const mostrar = () => { out.textContent = fmt(+inp.value); };
  inp.addEventListener('input', () => {
    cfg[chave] = +inp.value;
    mostrar();
    if (chave !== 'tamanho' && ev) ev.cfg[chave] = cfg[chave];
  });
  mostrar();
}
ligarFaixa('tamanho', 'tamanho', (v) => `${v}`);
ligarFaixa('mutacao', 'taxaMutacao', (v) => `${Math.round(v * 100)}%`);
ligarFaixa('torneio', 'torneio', (v) => `${v}`);
$('elitismo').checked = cfg.elitismo;
$('elitismo').addEventListener('change', (e) => { cfg.elitismo = e.target.checked; if (ev) ev.cfg.elitismo = cfg.elitismo; });
$('semente').value = semente;
$('nPista').value = nPista;

function ligarSeg(campo, valor, aoMudar) {
  const seg = document.querySelector(`.seg[data-campo="${campo}"]`);
  const marcar = (v) => seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
  marcar(valor);
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    marcar(b.dataset.v);
    aoMudar(b.dataset.v);
  });
}
ligarSeg('aptidao', aptidao, (v) => { aptidao = v; });
ligarSeg('velocidade', velocidade, (v) => { velocidade = v; });

$('reiniciar').addEventListener('click', () => {
  semente = Math.max(0, Math.floor(+$('semente').value || 0));
  nPista = Math.max(0, Math.floor(+$('nPista').value || 0));
  iniciar();
});
$('pausar').addEventListener('click', () => {
  pausado = !pausado;
  $('pausar').textContent = pausado ? 'Continuar' : 'Pausar';
});
$('voltar').addEventListener('click', () => { reprise = null; $('reprise').classList.remove('on'); });

// ---------- evolução ----------
function iniciar() {
  pista = gerarPista(nPista);
  ev = new Evolucao({ semente, criarGenoma: genomaAleatorio, rng: criarRng(semente), cfg: { ...cfg } });
  recorde = 0; recordeX = 0; reprise = null;
  $('reprise').classList.remove('on');
  $('campeoes').innerHTML = '<p class="vazio">O primeiro campeão aparece quando a geração 1 terminar.</p>';
  gApt.atualizar([]); gDiv.atualizar([]);
  novaGeracao();
  desenho.seguir(0, 2, true);
  const p = new URLSearchParams({ semente, pista: nPista, pop: cfg.tamanho, mut: cfg.taxaMutacao, torneio: cfg.torneio, elite: cfg.elitismo ? 1 : 0, aptidao });
  history.replaceState(null, '', `?${p}${location.hash}`);
}

function novaGeracao() {
  corridas = ev.pop.map((g) => new Corrida(g, pista, { pararAoCapotar: aptidao === 'robusta' }));
}

const distanciaValida = (c) => (aptidao === 'robusta' && c.capotou ? c.xCapotou : c.maxX);

function fimGeracao() {
  const res = corridas.map((c) => c.resultado());
  const apt = res.map(APTIDOES[aptidao]);
  const ind = apt.indexOf(Math.max(...apt));
  const reg = ev.registrar(apt, { resultado: res[ind] });
  if (reg.melhor > recorde) { recorde = reg.melhor; }
  recordeX = Math.max(recordeX, distanciaValida(corridas[ind]));
  const h = ev.historico;
  const cor = corSerie();
  gApt.atualizar([
    { nome: 'melhor', cor, valores: h.map((r) => r.melhor) },
    { nome: 'média', cor: '#eb6834', valores: h.map((r) => r.media) },
  ]);
  gDiv.atualizar([{ nome: '', cor, valores: h.map((r) => r.diversidade) }]);
  adicionarCampeao(reg);
  novaGeracao();
}

function adicionarCampeao(reg) {
  const box = $('campeoes');
  box.querySelector('.vazio')?.remove();
  const b = document.createElement('button');
  b.type = 'button';
  const st = reg.resultado.chegou ? 'cruzou a chegada' : reg.resultado.capotou ? 'capotou' : 'parou';
  b.title = `Geração ${reg.geracao + 1}: aptidão ${reg.melhor.toFixed(1)} (${st}). Toque para rever.`;
  b.innerHTML = `<canvas></canvas><b>${reg.melhor.toFixed(0)} m</b><span>geração ${reg.geracao + 1}</span>`;
  box.appendChild(b);
  desenharMiniatura(b.querySelector('canvas'), reg.campeao);
  b.addEventListener('click', () => {
    reprise = { corrida: new Corrida(reg.campeao, pista, { pararAoCapotar: aptidao === 'robusta' }), reg };
    $('repriseTxt').textContent = `Campeão da geração ${reg.geracao + 1} · ${reg.melhor.toFixed(1)}`;
    $('reprise').classList.add('on');
    desenho.seguir(0, 2, true);
  });
  box.scrollLeft = box.scrollWidth;
}

// ---------- laço de animação ----------
function avancar(lista) {
  let vivos = 0;
  for (const c of lista) if (c.passo()) vivos++;
  return vivos;
}

/** Avança a geração em `n` passos de física; fecha a geração quando todos terminam. */
function avancarGeracao(n) {
  for (let i = 0; i < n; i++) if (avancar(corridas) === 0) { fimGeracao(); return true; }
  return false;
}

let ultimoPainel = 0;
function quadro(t) {
  if (!pausado) {
    if (reprise) {
      const n = velocidade === 'max' ? 8 : +velocidade;
      for (let i = 0; i < n; i++) avancar([reprise.corrida]);
    } else if (velocidade === 'max') {
      const t0 = performance.now();
      while (performance.now() - t0 < 14) avancarGeracao(1);
    } else {
      avancarGeracao(+velocidade);
    }
  }
  const atual = reprise ? [reprise.corrida] : corridas;
  let lider = -1, melhor = -Infinity;
  atual.forEach((c, i) => {
    const d = c.terminou ? -Infinity : c.carroceria.getPosition().x;
    if (d > melhor) { melhor = d; lider = i; }
  });
  if (lider < 0) lider = 0;
  const p = atual[lider].carroceria.getPosition();
  desenho.seguir(p.x, p.y);
  desenho.desenhar({ pista, corridas: atual, lider, recorde: reprise ? 0 : recordeX });
  if (t - ultimoPainel > 200) { ultimoPainel = t; atualizarPainel(); }
  requestAnimationFrame(quadro);
}

function atualizarPainel() {
  const vivos = corridas.filter((c) => !c.terminou).length;
  $('pGeracao').textContent = `Geração ${ev.geracao + 1}`;
  $('pRodando').textContent = `${vivos} de ${corridas.length} na pista`;
  $('pTempo').textContent = `${Math.max(...corridas.map((c) => c.tempo)).toFixed(0)} s de corrida`;
  $('vGeracao').textContent = ev.geracao + 1;
  const dist = corridas.map(distanciaValida);
  $('vLider').textContent = `${Math.max(...dist).toFixed(0)} m`;
  $('vRecorde').textContent = recorde ? recorde.toFixed(0) : '–';
  const h = ev.historico;
  $('vDiversidade').textContent = h.length ? h[h.length - 1].diversidade.toFixed(2) : '1,00';
  const ord = dist.map((d, i) => i).sort((a, b) => dist[b] - dist[a]).slice(0, 8);
  $('placar').innerHTML = ord.map((i, k) => {
    const c = corridas[i];
    const st = c.chegou ? 'cruzou a chegada' : !c.terminou ? (c.capotou ? 'capotado, rodando' : 'rodando') : c.capotou ? 'capotou' : 'parou';
    const origem = cfg.elitismo && ev.geracao > 0 && i < 2 ? ' · elite' : '';
    return `<tr class="${k === 0 ? 'lider' : ''}"><td>${k + 1}</td><td>nº ${i + 1}<span class="st">${origem}</span></td><td>${dist[i].toFixed(1)} m</td><td class="st">${st}</td></tr>`;
  }).join('');
}

// abas
const abas = [['aba-carros', 'painel-carros'], ['aba-revoada', 'painel-revoada']];
for (const [a, p] of abas) $(a).addEventListener('click', () => {
  for (const [a2, p2] of abas) { $(a2).setAttribute('aria-selected', String(a2 === a)); $(p2).hidden = p2 !== p; }
  if (p === 'painel-carros') desenho.redimensionar();
});

iniciar();
requestAnimationFrame(quadro);
// Para conferência (console): __demo.geracoes(3) roda 3 gerações completas sem animação.
window.__demo = {
  get ev() { return ev; }, get pista() { return pista; },
  geracoes(n = 1) { for (let g = 0; g < n; g++) while (!avancarGeracao(1)); atualizarPainel(); return ev.historico.map((h) => h.melhor); },
};
