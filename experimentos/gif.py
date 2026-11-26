"""Monta web/figuras/evolucao.gif a partir de experimentos/brutos/gif.json.

Uso:
    node experimentos/gif_dados.js
    python experimentos/gif.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parents[1]
D = json.loads((RAIZ / "experimentos" / "brutos" / "gif.json").read_text(encoding="utf-8"))
W, H, SS = 640, 266, 2          # tamanho final e supersampling
ESC = H * SS / 13               # pixels por metro (como na demo)
CEU, CHAO, BORDA = (242, 242, 247), (199, 199, 204), (142, 142, 147)
AZUL, CINZA, RODA, TINTA = (0, 122, 255), (99, 99, 102), (58, 58, 60), (28, 28, 30)


def fonte(tam):
    for nome in ("segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(nome, tam)
        except OSError:
            continue
    return ImageFont.load_default()


F1, F2 = fonte(15 * SS), fonte(12 * SS)
pista = D["pista"]


def quadro(seg, q, cam):
    img = Image.new("RGB", (W * SS, H * SS), CEU)
    d = ImageDraw.Draw(img, "RGBA")
    ox = W * SS * 0.38 - cam[0] * ESC
    oy = H * SS * 0.6 + cam[1] * ESC
    X = lambda x: ox + x * ESC
    Y = lambda y: oy - y * ESC
    xmin, xmax = -ox / ESC - 2, (W * SS - ox) / ESC + 2
    vis = [(X(x), Y(y)) for x, y in pista if xmin - 2 <= x <= xmax + 2]
    if len(vis) > 1:
        d.polygon(vis + [(vis[-1][0], H * SS), (vis[0][0], H * SS)], fill=CHAO)
        d.line(vis, fill=BORDA, width=2 * SS)
    for m in range(0, int(D["chegada"]), 25):
        if xmin < m < xmax:
            yy = next(Y(y) for x, y in pista if x >= m)
            d.text((X(m), yy + 8 * SS), f"{m} m", fill=(28, 28, 30, 140), font=F2, anchor="mt")
    lider = max(range(len(q)), key=lambda i: -1e9 if q[i][3] else q[i][0])
    for i in sorted(range(len(q)), key=lambda i: i == lider):
        x, y, a, fim, *rodas = q[i]
        f = seg["formas"][i]
        cor = AZUL if i == lider else CINZA
        alfa = 50 if fim else (235 if i == lider else 70)
        c, s = math.cos(a), math.sin(a)
        pts = [(X(x + vx * c - vy * s), Y(y + vx * s + vy * c)) for vx, vy in f["vertices"]]
        d.polygon(pts, fill=cor + (alfa,), outline=cor + (min(255, alfa + 60),))
        for k, rd in enumerate(f["rodas"]):
            vx, vy = f["vertices"][rd["vertice"]]
            cx, cy = X(x + vx * c - vy * s), Y(y + vx * s + vy * c)
            rr = rd["raio"] * ESC
            d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(RODA if i == lider else CINZA) + (alfa,))
            ar = rodas[k]
            d.line([cx, cy, cx + math.cos(ar) * rr * 0.8, cy - math.sin(ar) * rr * 0.8], fill=(242, 242, 247, alfa), width=max(1, int(rr * 0.18)))
    vivos = sum(1 for v in q if not v[3])
    d.rounded_rectangle([10 * SS, 10 * SS, 250 * SS, 36 * SS], radius=13 * SS, fill=(0, 0, 0, 140))
    d.text((22 * SS, 23 * SS), f"Geração {seg['geracao']} · {vivos} de {len(q)} na pista", fill="white", font=F1, anchor="lm")
    return img.resize((W, H), Image.LANCZOS), q[lider]


frames = []
for seg in D["segmentos"]:
    q0 = seg["quadros"][0]
    cam = [q0[0][0], q0[0][1]]
    for q in seg["quadros"]:
        lider = max((v for v in q if not v[3]), key=lambda v: v[0], default=q[0])
        cam[0] += (lider[0] - cam[0]) * 0.15
        cam[1] += (lider[1] - cam[1]) * 0.15
        img, _ = quadro(seg, q, cam)
        frames.append(img.convert("P", palette=Image.ADAPTIVE, colors=24))
    frames.extend([frames[-1]] * 12)

saida = RAIZ / "web" / "figuras" / "evolucao.gif"
saida.parent.mkdir(parents=True, exist_ok=True)
frames[0].save(saida, save_all=True, append_images=frames[1:], duration=66, loop=0, optimize=True)
print(f"{saida.name}: {len(frames)} quadros, {saida.stat().st_size / 1e6:.1f} MB")
