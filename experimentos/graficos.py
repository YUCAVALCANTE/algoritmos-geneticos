"""Gera as figuras do relatório a partir de experimentos/resultados/resumo.json.

Uso:
    python experimentos/graficos.py

Saída: web/figuras/*.png (usadas pelo README e pela página da demo).
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Circle, Polygon

RAIZ = Path(__file__).resolve().parents[1]
SAIDA = RAIZ / "web" / "figuras"
SAIDA.mkdir(parents=True, exist_ok=True)
R = json.loads((RAIZ / "experimentos" / "resultados" / "resumo.json").read_text(encoding="utf-8"))

# paleta categórica validada (ordem fixa) e tinta neutra
AZUL, LARANJA, VERDE_AGUA, AMARELO = "#2a78d6", "#eb6834", "#1baf7a", "#eda100"
TINTA, TINTA2, GRADE, CHAO = "#1c1c1e", "#6c6c70", "#e5e5ea", "#d1d1d6"

plt.rcParams.update({
    "font.family": ["Segoe UI", "Arial", "DejaVu Sans"],
    "font.size": 10.5, "axes.titlesize": 12, "axes.titleweight": "600", "axes.titlelocation": "left",
    "axes.edgecolor": GRADE, "axes.labelcolor": TINTA2, "xtick.color": TINTA2, "ytick.color": TINTA2,
    "axes.grid": True, "grid.color": GRADE, "grid.linewidth": 0.8, "axes.axisbelow": True,
    "axes.spines.top": False, "axes.spines.right": False, "legend.frameon": False,
    "figure.dpi": 110, "savefig.dpi": 160, "savefig.bbox": "tight", "savefig.facecolor": "white",
    "lines.linewidth": 2, "text.color": TINTA,
})


def salvar(fig, nome):
    fig.savefig(SAIDA / nome)
    plt.close(fig)
    print("figura:", nome)


def pista_pontos(semente_pista: int = 1):
    """Reproduz gerarPista() só para desenhar (o desenho não precisa ser bit a bit)."""
    import subprocess
    out = subprocess.run(
        ["node", "-e", f"import('./web/src/pista.js').then(m=>console.log(JSON.stringify(m.gerarPista({semente_pista}).pontos)))"],
        cwd=RAIZ, capture_output=True, text=True, check=True,
    ).stdout
    return np.array(json.loads(out))


# ---------- 1. aptidão mal formulada ----------
def fig_aptidao():
    e1 = R["e1"]
    fig, ax = plt.subplots(figsize=(7.6, 4.2))
    grupos = [("ingenua", "Treinado com\n“só distância”"), ("robusta", "Treinado com\n“distância sem capotar”")]
    for gi, (chave, rotulo) in enumerate(grupos):
        for k, c in enumerate(e1[chave]):
            x0 = gi * 2 + (k - 2) * 0.05
            ax.plot([x0, x0 + 1], [c["ingenua"], c["robusta"]], color=TINTA2, alpha=0.35, lw=1.2, zorder=1)
            ax.scatter([x0], [c["ingenua"]], s=46, color=LARANJA, zorder=3, edgecolor="white", linewidth=1.5)
            ax.scatter([x0 + 1], [c["robusta"]], s=46, color=AZUL, zorder=3, edgecolor="white", linewidth=1.5)
        mi = np.mean([c["ingenua"] for c in e1[chave]])
        mr = np.mean([c["robusta"] for c in e1[chave]])
        ax.text(gi * 2 + 0.5, -0.2, rotulo, ha="center", va="top", fontsize=10.5, color=TINTA, transform=ax.get_xaxis_transform())
        ax.text(gi * 2 - 0.28, mi, f"média\n{mi:.0f}", ha="right", va="center", fontsize=9.5, color=TINTA, fontweight="600")
        ax.text(gi * 2 + 1.28, mr, f"média\n{mr:.0f}", ha="left", va="center", fontsize=9.5, color=TINTA, fontweight="600")
    ax.set_xticks([0, 1, 2, 3], ["distância\nmáxima", "distância até\ncapotar", "distância\nmáxima", "distância até\ncapotar"])
    ax.set_xlim(-0.8, 3.8)
    ax.set_ylim(-5, None)
    ax.set_ylabel("metros na pista 1 (mesmo campeão, duas réguas)")
    ax.set_title("O campeão de cada execução medido pelas duas aptidões (5 sementes)")
    ax.scatter([], [], color=LARANJA, label="medido por “só distância”")
    ax.scatter([], [], color=AZUL, label="medido por “distância sem capotar”")
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.36), ncol=2)
    ax.grid(axis="x", visible=False)
    salvar(fig, "1_aptidao_errada.png")


def desenhar_carro(ax, forma, x, y, ang, cor, alfa=1.0):
    c, s = math.cos(ang), math.sin(ang)
    pts = [(x + vx * c - vy * s, y + vx * s + vy * c) for vx, vy in forma["vertices"]]
    ax.add_patch(Polygon(pts, closed=True, facecolor=cor, edgecolor=cor, alpha=alfa, lw=0.8, zorder=3))
    for rd in forma["rodas"]:
        vx, vy = forma["vertices"][rd["vertice"]]
        ax.add_patch(Circle((x + vx * c - vy * s, y + vx * s + vy * c), rd["raio"], facecolor="#3a3a3c", alpha=alfa, zorder=4))


JANELA = 34


def fig_trajetoria():
    ex = R["e1"]["exemplo"]
    pts = pista_pontos(1)
    fig, eixos = plt.subplots(2, 1, figsize=(10, 5.2), sharex=True)
    for ax, chave, cor, titulo in [
        (eixos[0], "ingenuo", LARANJA, "Campeão evoluído com “só distância”"),
        (eixos[1], "robusto", AZUL, "Campeão evoluído com “distância sem capotar”"),
    ]:
        q = np.array(ex[chave]["quadros"])
        xs = np.linspace(0, JANELA - 4, 8)
        idx = [int(np.argmin(np.abs(q[:, 1] - xx))) for xx in xs]
        ax.fill_between(pts[:, 0], pts[:, 1], pts[:, 1].min() - 3, color=CHAO, lw=0)
        ax.plot(pts[:, 0], pts[:, 1], color="#8e8e93", lw=1.2)
        for i in sorted(set(idx)):
            capot = q[i, 4] > 0.5
            desenhar_carro(ax, ex[chave]["forma"], q[i, 1], q[i, 2], q[i, 3], cor, 0.35 if capot else 0.95)
        cap = np.where(q[:, 4] > 0.5)[0]
        fim = q[-1, 1]
        cap_txt = f"capotou aos {q[cap[0], 1]:.0f} m e seguiu de cabeça para baixo até {fim:.0f} m" if len(cap) else f"nunca capotou; parou aos {fim:.0f} m"
        ax.set_title(f"{titulo}: {cap_txt}", fontsize=11)
        ax.set_aspect("equal")
        janela = pts[(pts[:, 0] >= -3) & (pts[:, 0] <= JANELA)]
        ax.set_ylim(janela[:, 1].min() - 1.5, janela[:, 1].max() + 4)
        ax.grid(False)
        ax.set_yticks([])
        ax.spines["left"].set_visible(False)
    eixos[1].set_xlabel(f"primeiros {JANELA} m da pista 1 · silhuetas a cada ~4 m; translúcidas = já capotado")
    eixos[1].set_xlim(-3, JANELA)
    salvar(fig, "1b_trajetorias.png")


# ---------- 2. convergência prematura ----------
def fig_convergencia():
    e2 = R["e2"]
    cores = [AZUL, LARANJA, VERDE_AGUA, AMARELO]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 4.2), gridspec_kw={"width_ratios": [1.15, 1]})
    for k, taxa in enumerate(e2["taxas"]):
        c = next(c for c in e2["configs"] if c["taxa"] == taxa and c["elitismo"])
        d = np.array(c["diversidade"])
        g = np.arange(1, d.shape[1] + 1)
        a1.fill_between(g, d.min(0), d.max(0), color=cores[k], alpha=0.12, lw=0)
        a1.plot(g, d.mean(0), color=cores[k], label=f"mutação {taxa:.0%}")
        a1.text(g[-1] + 0.4, d.mean(0)[-1], f"{taxa:.0%}", color=TINTA, va="center", fontsize=9.5, fontweight="600")
    a1.set_ylim(0, 1.05)
    a1.set_xlabel("geração")
    a1.set_ylabel("diversidade (1 = população aleatória)")
    a1.set_title("Diversidade cai rápido com pouca mutação (com elitismo)")
    a1.legend(loc="upper right", fontsize=9)

    for j, (elit, cor, rot) in enumerate([(True, AZUL, "com elitismo"), (False, LARANJA, "sem elitismo")]):
        for k, taxa in enumerate(e2["taxas"]):
            c = next(c for c in e2["configs"] if c["taxa"] == taxa and c["elitismo"] == elit)
            x = k + (j - 0.5) * 0.28
            v = np.array(c["melhorFinal"])
            a2.scatter(np.full(len(v), x), v, s=22, color=cor, alpha=0.55, edgecolor="white", linewidth=1, zorder=3)
            a2.plot([x - 0.1, x + 0.1], [v.mean(), v.mean()], color=cor, lw=2.6, zorder=4)
        a2.scatter([], [], color=cor, label=rot)
    a2.set_xticks(range(len(e2["taxas"])), [f"{t:.0%}" for t in e2["taxas"]])
    a2.set_xlabel("taxa de mutação por gene")
    a2.set_ylabel("melhor aptidão após 30 gerações")
    a2.set_title("Resultado final (pontos = sementes, traço = média)")
    a2.legend(loc="lower right", fontsize=9)
    a2.grid(axis="x", visible=False)
    salvar(fig, "2_convergencia.png")


# ---------- 3. generalização ----------
def fig_generalizacao():
    e3 = R["e3"]
    fig, ax = plt.subplots(figsize=(7.6, 4.2))
    for gi, (chave, cor, rot) in enumerate([("pistaUnica", AZUL, "Evoluído só na pista 1"), ("multiplas", VERDE_AGUA, "Evoluído nas pistas 1, 2 e 3")]):
        for c in e3[chave]:
            x0 = gi * 2.4
            ax.plot([x0, x0 + 1], [c["pista1"], c["mediaTeste"]], color=cor, alpha=0.45, lw=1.3)
            ax.scatter([x0, x0 + 1], [c["pista1"], c["mediaTeste"]], s=30, color=cor, edgecolor="white", linewidth=1.2, zorder=3)
        m1 = np.mean([c["pista1"] for c in e3[chave]])
        mt = np.mean([c["mediaTeste"] for c in e3[chave]])
        ax.plot([gi * 2.4, gi * 2.4 + 1], [m1, mt], color=cor, lw=3.2, zorder=4)
        ax.text(gi * 2.4 - 0.12, m1, f"{m1:.0f}", ha="right", va="center", fontweight="600", fontsize=10)
        ax.text(gi * 2.4 + 1.12, mt, f"{mt:.0f}", ha="left", va="center", fontweight="600", fontsize=10)
        ax.text(gi * 2.4 + 0.5, -0.2, rot, ha="center", va="top", fontsize=10.5, transform=ax.get_xaxis_transform())
    ax.set_xticks([0, 1, 2.4, 3.4], ["pista 1", "10 pistas\nnovas (média)", "pista 1", "10 pistas\nnovas (média)"])
    ax.set_xlim(-0.6, 4.0)
    ax.set_ylim(0, None)
    ax.set_ylabel("aptidão (distância sem capotar, m)")
    ax.set_title("Campeões fora da pista onde evoluíram (5 sementes; linha grossa = média)")
    ax.grid(axis="x", visible=False)
    salvar(fig, "3_generalizacao.png")


# ---------- 4. linhas de base ----------
def fig_linhas_base():
    e4 = R["e4"]
    fig, ax = plt.subplots(figsize=(7.6, 4.2))
    nomes = {"ag": ("Algoritmo genético", AZUL), "hill": ("Hill climbing (1+1)", LARANJA), "aleatoria": ("Busca aleatória", VERDE_AGUA)}
    for chave, (rot, cor) in nomes.items():
        cv = np.array(e4["metodos"][chave]["curvas"])
        x = np.minimum(np.arange(1, cv.shape[1] + 1) * 20, e4["avaliacoes"])
        ax.fill_between(x, cv.min(0), cv.max(0), color=cor, alpha=0.12, lw=0)
        ax.plot(x, cv.mean(0), color=cor, label=rot)
        ax.text(x[-1] + 15, cv.mean(0)[-1], f"{cv.mean(0)[-1]:.0f}", va="center", fontsize=10, fontweight="600")
    ax.set_xlabel("carros avaliados (mesmo orçamento para os três)")
    ax.set_ylabel("melhor aptidão encontrada até então")
    ax.set_title("Mesmo número de avaliações, 5 sementes (faixa = mín.–máx.)")
    ax.legend(loc="lower right")
    salvar(fig, "4_linhas_de_base.png")


if __name__ == "__main__":
    fig_aptidao()
    fig_trajetoria()
    fig_convergencia()
    fig_generalizacao()
    fig_linhas_base()
