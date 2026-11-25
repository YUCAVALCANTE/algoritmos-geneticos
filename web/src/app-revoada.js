// Aba REVOADA: letras evoluindo até a palavra-alvo.
import { criarRng } from './rng.js';
import { ALFABETO, aptidaoTexto, criarPopulacaoTexto, proximaGeracaoTexto } from './revoada.js';

const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat('pt-BR');
let timer = null;

for (const [id, f] of [['rTamanho', (v) => v], ['rMutacao', (v) => `${Math.round(v * 100)}%`]]) {
  const out = $(`or${id.slice(1)}`);
  const mostrar = () => { out.textContent = f(+$(id).value); };
  $(id).addEventListener('input', mostrar);
  mostrar();
}

function mostrarPalavra(s, alvo) {
  $('rPalavra').innerHTML = [...s].map((ch, i) => `<span class="${ch === alvo[i] ? 'ok' : 'no'}">${ch}</span>`).join('');
}

function iniciar() {
  clearInterval(timer);
  const alvo = ($('rAlvo').value.toUpperCase().replace(/[^A-Z]/g, '') || 'REVOADA').slice(0, 24);
  $('rAlvo').value = alvo;
  const tamanho = +$('rTamanho').value, taxaMutacao = +$('rMutacao').value;
  const rng = criarRng(`revoada:${$('rSemente').value}`);
  let pop = criarPopulacaoTexto(alvo, tamanho, rng), g = 0;
  const cego = ALFABETO.length ** alvo.length;
  $('rCego').textContent = cego > 1e12 ? cego.toExponential(1).replace('e+', ' × 10^') : fmt.format(cego);
  $('rHistorico').innerHTML = '';
  const passo = () => {
    const apt = pop.map((s) => aptidaoTexto(s, alvo));
    const i = apt.indexOf(Math.max(...apt));
    mostrarPalavra(pop[i], alvo);
    $('rGeracao').textContent = g + 1;
    $('rAcertos').textContent = `${apt[i]} de ${alvo.length}`;
    $('rAvaliacoes').textContent = fmt.format((g + 1) * tamanho);
    const li = document.createElement('li');
    li.innerHTML = `<b>${g + 1}</b><span>${pop[i]}</span><span>${apt[i]}/${alvo.length}</span>`;
    $('rHistorico').prepend(li);
    if (apt[i] === alvo.length || g >= 999) { clearInterval(timer); return; }
    pop = proximaGeracaoTexto(pop, alvo, { taxaMutacao }, rng);
    g++;
  };
  passo();
  timer = setInterval(passo, 90);
}

$('rIniciar').addEventListener('click', iniciar);
$('aba-revoada').addEventListener('click', () => { if (!timer) iniciar(); });
