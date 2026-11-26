// Gera web/resultados/achados.json (seção de experimentos da demo) e
// web/resultados/vitrine.json (mini-gráfico do card em yucavalcante.com)
// a partir de experimentos/resultados/resumo.json.
//
//   node experimentos/publicar.js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const R = JSON.parse(readFileSync('experimentos/resultados/resumo.json', 'utf8'));
const media = (v) => v.reduce((a, b) => a + b, 0) / v.length;
const n0 = (x) => Math.round(x).toLocaleString('pt-BR');
const pct = (x) => `${Math.round(x * 100)}%`;
const d2 = (x) => x.toFixed(2).replace('.', ',');

const { e1, e2, e3, e4 } = R;
const ingRob = e1.ingenua.map((x) => x.robusta);
const zerados = ingRob.filter((v) => v < 1).length;
const cfg = (t, e) => e2.configs.find((c) => c.taxa === t && c.elitismo === e);
const divFinal = (c) => media(c.diversidade.map((d) => d.at(-1)));
const fin = (c) => media(c.melhorFinal);
const queda = (k) => 1 - media(e3[k].map((x) => x.mediaTeste)) / media(e3[k].map((x) => x.pista1));
const m4 = Object.fromEntries(Object.entries(e4.metodos).map(([k, v]) => [k, media(v.final)]));

const achados = [
  {
    titulo: 'A aptidão errada cria um carro absurdo',
    artigo: 'se a aptidão mede só o deslocamento horizontal, um carro "arremessado" pode maximizar a métrica sem fazer o que se queria.',
    aqui: `com "só distância", os campeões foram tão longe quanto os outros (média de ${n0(media(e1.ingenua.map((x) => x.ingenua)))} m), mas ${zerados} de 5 capotaram logo na largada e seguiram de cabeça para baixo, apoiados numa roda gigante. Medidos por "distância sem capotar", fazem ${n0(media(ingRob))} m em média, contra ${n0(media(e1.robusta.map((x) => x.robusta)))} m dos evoluídos com a aptidão certa.`,
    figura: 'figuras/1b_trajetorias.png',
    alt: 'Campeão da aptidão só distância capota no início e anda de cabeça para baixo; o da aptidão robusta anda de pé.',
  },
  {
    titulo: 'Pouca mutação, população de clones',
    artigo: 'mutação baixa demais limita a exploração e a população pode convergir cedo para uma solução ruim; não existe taxa universalmente ideal.',
    aqui: `com mutação de 1% por gene, a diversidade cai a ${d2(divFinal(cfg(0.01, true)))} em 30 gerações (quase clones) e o melhor carro fica em ${n0(fin(cfg(0.01, true)))} m; com 15%, a diversidade fica em ${d2(divFinal(cfg(0.15, true)))} e o resultado sobe para ${n0(fin(cfg(0.15, true)))} m. Com 30%, não melhora mais. O elitismo mudou pouco o resultado final (diferenças dentro da variação entre sementes).`,
    figura: 'figuras/2_convergencia.png',
    alt: 'Diversidade por geração para quatro taxas de mutação e resultado final com e sem elitismo.',
  },
  {
    titulo: 'Bom numa pista, um pouco pior nas outras',
    artigo: 'uma solução otimizada para um terreno pode falhar em outro; vale avaliar em ambientes que o algoritmo nunca viu.',
    aqui: `campeões evoluídos só na pista 1 perdem ${pct(queda('pistaUnica'))} da distância em 10 pistas novas. Evoluir em 3 pistas ao mesmo tempo, com o mesmo número de gerações, não ajudou aqui: a perda foi de ${pct(queda('multiplas'))}. As pistas vêm do mesmo gerador, então a especialização é pequena; o resultado negativo está no relatório.`,
    figura: 'figuras/3_generalizacao.png',
    alt: 'Aptidão na pista 1 e média em 10 pistas novas para campeões de uma pista e de três pistas.',
  },
  {
    titulo: 'Melhor que as linhas de base, sem mágica',
    artigo: 'o AG é uma heurística: não garante o ótimo e cada avaliação custa caro.',
    aqui: `com as mesmas ${n0(e4.avaliacoes)} avaliações, o AG chegou a ${n0(m4.ag)} m em média, a busca aleatória a ${n0(m4.aleatoria)} m e o hill climbing a ${n0(m4.hill)} m (ele trava no primeiro carro razoável). Nenhum cruzou a chegada em ${n0(e4.avaliacoes)} avaliações.`,
    figura: 'figuras/4_linhas_de_base.png',
    alt: 'Melhor aptidão por número de avaliações para AG, hill climbing e busca aleatória.',
  },
];

mkdirSync('web/resultados', { recursive: true });
writeFileSync('web/resultados/achados.json', JSON.stringify(achados, null, 2));
writeFileSync('web/resultados/vitrine.json', JSON.stringify([
  { metodo: 'Algoritmo genético', valor: Math.round(m4.ag) },
  { metodo: 'Busca aleatória', valor: Math.round(m4.aleatoria) },
  { metodo: 'Hill climbing', valor: Math.round(m4.hill) },
]));
for (const a of achados) console.log(`- ${a.titulo}: ${a.aqui}\n`);
