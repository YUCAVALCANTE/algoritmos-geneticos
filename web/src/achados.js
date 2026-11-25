// Seção "Os pontos do artigo, agora com números": lê resultados/achados.json
// (gerado pelos experimentos) e monta um cartão por experimento.
const box = document.getElementById('achados');
try {
  const r = await fetch('resultados/achados.json');
  if (!r.ok) throw new Error(r.status);
  const dados = await r.json();
  box.innerHTML = dados.map((a, i) => `
    <article class="card passo"><span class="num">${i + 1}</span><div>
      <h3>${a.titulo}</h3>
      <p><b>No artigo:</b> ${a.artigo}</p>
      <p><b>Aqui:</b> ${a.aqui}</p>
      ${a.figura ? `<figure class="fig"><img src="${a.figura}" alt="${a.alt}" loading="lazy"></figure>` : ''}
    </div></article>`).join('');
} catch {
  box.innerHTML = '<p class="vazio">Os resultados dos experimentos estão no <a href="https://github.com/YUCAVALCANTE/algoritmos-geneticos#readme">relatório</a>.</p>';
}
