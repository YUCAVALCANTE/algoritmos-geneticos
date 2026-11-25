# Algoritmos genéticos: carros que ninguém projetou

**Demo ao vivo: [yucavalcante.com/algoritmos-geneticos](https://yucavalcante.com/algoritmos-geneticos/)** · [![CI](https://github.com/YUCAVALCANTE/algoritmos-geneticos/actions/workflows/ci.yml/badge.svg)](https://github.com/YUCAVALCANTE/algoritmos-geneticos/actions/workflows/ci.yml)

![Gerações 1, 5 e 30 da mesma evolução: o carro em azul é o que está na frente](web/figuras/evolucao.gif)

Uma população de 40 carros 2D tenta atravessar uma pista acidentada. Ninguém programou como um bom carro deve ser: cada carro é só um cromossomo de 14 números (formato da carroceria, posição e tamanho das rodas, densidade das peças), e o algoritmo genético recebe apenas **o que conta como bom**. Seleção, cruzamento e mutação fazem o resto.

Este projeto acompanha o artigo [**"Algoritmos genéticos: quando uma máquina encontra soluções que ninguém programou"**](https://medium.com/@yucavalcante/algoritmos-gen%C3%A9ticos-quando-uma-m%C3%A1quina-encontra-solu%C3%A7%C3%B5es-que-ningu%C3%A9m-programou-1a6fbd77c3da), da série *IA sem mágica* no Medium. O artigo usa os carros numa pista como exemplo central e levanta quatro pontos; aqui cada um vira um experimento reproduzível:

| Ponto do artigo | Pergunta testada | Resposta curta |
|---|---|---|
| A função de aptidão define o que é "bom" | O que acontece se a aptidão medir só a distância horizontal? | __R1__ |
| Pouca diversidade leva à convergência prematura | Como taxa de mutação e elitismo afetam a diversidade e o resultado final? | __R2__ |
| Uma solução boa num ambiente pode falhar em outro | O campeão de uma pista funciona em pistas nunca vistas? E evoluindo em várias ao mesmo tempo? | __R3__ |
| AG não é mágica | Ele supera busca aleatória e hill climbing com o mesmo número de avaliações? | __R4__ |

O exemplo de 30 segundos do artigo, letras aleatórias evoluindo até a palavra **REVOADA**, está numa aba da demo, com os parâmetros do texto (população de 200, mutação de 5% por letra, torneio de 5, cruzamento de um ponto, elitismo de 1, semente 42). O artigo não diz em quantas gerações a palavra aparece: com a semente 42 são **8 gerações (1.600 palavras avaliadas)**, e nas sementes 1 a 10, de 5 a 9, contra 26⁷ ≈ 8 bilhões de combinações possíveis. (O nome é uma referência ao [projeto Revoada](https://github.com/YUCAVALCANTE/agente-revoada), o agente de visão computacional da mesma série.)

---

## 1. Como o problema foi representado

**Cromossomo** (14 genes reais em [0, 1], decodificados em `web/src/carro.js`):

| Genes | Significado | Faixa física |
|---|---|---|
| 0–7 | distância de cada um dos 8 vértices da carroceria ao centro (ângulos fixos a cada 45°) | 0,25–1,6 m |
| 8, 10 | vértice onde cada uma das duas rodas está presa | vértice 0–7 |
| 9, 11 | raio de cada roda | 0,18–0,85 m |
| 12, 13 | densidade da carroceria e das rodas | 0,6–5 kg/m² |

**Física**: [planck.js](https://github.com/piqnt/planck.js) (porta em JavaScript do Box2D), passo fixo de 1/30 s. As duas rodas têm motor com a mesma velocidade e torque máximo para todos os carros: o AG só controla a forma e a massa. A corrida acaba quando o carro cruza a chegada, fica 4 s sem avançar 30 cm, passa de 60 s ou, na aptidão robusta, capota (carroceria girada mais de ~110°).

**Pista**: gerada por semente (`web/src/pista.js`). Depois de 10 m planos, 320 segmentos de 1 m cuja inclinação segue um passeio aleatório suavizado; a inclinação máxima cresce de 9° no começo a 86° no fim, então a pista fica mais difícil à medida que o carro avança (~277 m até a chegada na pista 1).

**Duas aptidões**:
- *só distância* (`ingenua`): a maior posição horizontal que a carroceria alcançou, de qualquer jeito;
- *distância sem capotar* (`robusta`): a posição alcançada até o momento em que o carro capota; quem cruza a chegada sem capotar ganha 1 m por segundo poupado.

**Algoritmo genético** (`web/src/ga.js`): população de 40, seleção por torneio de 3, cruzamento uniforme (90%), mutação gaussiana por gene (σ = 0,2, refletida nas bordas) e elitismo opcional de 2 indivíduos. **Diversidade** = desvio-padrão médio dos genes, dividido pelo de uma população uniforme (1 = aleatória, 0 = clones).

### Determinismo: o mesmo número no navegador e no Node

Cada carro roda no próprio mundo físico, então o resultado não depende dos outros carros nem da ordem de avaliação: a demo, que avança a geração inteira em lockstep na tela, e o Node, que avalia um carro por vez, chegam ao mesmo número. Um detalhe só apareceu na prática: `Math.sin`, `Math.cos` e `Math.atan2` não são exigidos pela especificação a dar o mesmo último bit em todo motor, e o Node e o Chromium divergiam (31,5017 m contra 31,5015 m no mesmo carro). Numa simulação caótica isso basta para o melhor carro da geração 1 ir a 113,8 m num e 81,3 m no outro. A correção foi escrever trigonometria e logaritmo só com operações que o IEEE 754 exige exatas (`web/src/dmath.js`) e trocá-las dentro do planck.js (`scripts/vendorizar-planck.mjs`). Um teste fixa o valor de referência (81,28788015352924 m) e o CI confere em Linux e Windows, em duas versões do Node.

---

## 2. Protocolo

- Pista de treino: nº 1. Pistas de teste (generalização): nº 101 a 110, nunca usadas no treino.
- Cada configuração do AG: 40 carros × 30 gerações = **1.200 avaliações**, **5 sementes** (1 a 5).
- Configuração de referência: aptidão robusta, mutação 5%, torneio 3, elitismo ligado.
- Linhas de base com o mesmo orçamento de 1.200 avaliações e as mesmas 5 sementes:
  - **busca aleatória**: 1.200 carros sorteados de forma independente;
  - **hill climbing (1+1)**: muta o carro atual (cada gene com probabilidade 20%, σ = 0,15, ao menos um gene) e fica com o vizinho se ele não for pior.
- O AG com elitismo reavalia os 2 elites a cada geração; essas reavaliações contam no orçamento (desvantagem para o AG).
- Números: média das 5 sementes, com os valores individuais nos gráficos. Com 5 sementes, diferenças pequenas não são conclusivas; o texto diz quando é o caso.

---

## 3. Resultados

__RESULTADOS__

---

## 4. Limitações

__LIMITACOES__

---

## 5. Como reproduzir

Requisitos: Node 22+ (sem dependências de npm) e, para os gráficos, Python 3.11+ com matplotlib, numpy e pillow.

```bash
npm test                                   # seleção, cruzamento, mutação, determinismo (~3 s)
node experimentos/rodar.js --rapido        # fumaça: 2 gerações, nada é salvo
node experimentos/rodar.js                 # 60 execuções em paralelo; retoma de onde parou
node experimentos/analisar.js              # examina campeões e pistas de teste → resultados/resumo.json
python experimentos/graficos.py            # figuras em web/figuras/
node experimentos/gif_dados.js && python experimentos/gif.py   # GIF do topo
```

Para ver a demo localmente: `python -m http.server -d web 8000` e abra `http://localhost:8000`. O endereço da página guarda a configuração (`?semente=1&pista=1&pop=40&mut=0.05&torneio=3&elite=1&aptidao=robusta`), e no console `__demo.geracoes(3)` roda três gerações sem animação e devolve a melhor aptidão de cada uma, para comparar com o Node.

### Estrutura

```
web/                 demo (GitHub Pages) e todo o código de simulação, compartilhado com o Node
  src/rng.js         gerador pseudoaleatório com semente (sfc32)
  src/dmath.js       sin, cos, atan2 e log determinísticos
  src/pista.js       pista gerada por semente
  src/carro.js       cromossomo → carro
  src/simulacao.js   corrida de um carro, aptidões
  src/ga.js          torneio, cruzamento, mutação, elitismo, diversidade
  src/revoada.js     o exemplo REVOADA
  vendor/planck.mjs  planck.js 1.5.1 com a trigonometria trocada
experimentos/        rodar.js (pool de threads), nucleo.js (AG e linhas de base), analisar.js, graficos.py, gif.py
testes/              node:test
```

Pista, carros, arte e nomes são originais e gerados por código. Código sob licença MIT; planck.js sob MIT (ver `web/vendor/planck-LICENSE.txt`).
