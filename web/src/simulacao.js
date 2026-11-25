// Corrida de um carro numa pista. Cada carro tem o próprio mundo físico (planck.js),
// e por isso o resultado de um carro não depende dos outros nem da ordem de avaliação:
// a demo, que mostra a geração inteira, e o Node, que avalia um por um, dão o mesmo número.
import { World, Vec2, Polygon, Circle, Chain, RevoluteJoint } from '../vendor/planck.mjs';
import { decodificar } from './carro.js';
import { sin, cos, atan2 } from './dmath.js';

export const FISICA = {
  dt: 1 / 30,
  iterVel: 8,
  iterPos: 3,
  gravidade: -9.8,
  velMotor: 14,        // rad/s
  torqueMotor: 45,     // N·m por roda
  atritoChao: 0.9,
  atritoRoda: 1.0,
  tempoMax: 60,        // s
  janelaParado: 4,     // s sem avançar 0,3 m encerra a corrida
  anguloCapotou: 1.9,  // rad (~110°): carroceria virada
};

/** Aptidões disponíveis. Recebem o resultado da corrida e devolvem um número. */
export const APTIDOES = {
  // Só a distância horizontal máxima, não importa como o carro chegou lá.
  ingenua: (r) => r.maxX,
  // Distância até capotar; quem cruza a chegada sem capotar ganha 1 m por segundo poupado.
  robusta: (r) => (r.capotou ? r.xCapotou : r.maxX) + (r.chegou && !r.capotou ? FISICA.tempoMax - r.tempo : 0),
};

export class Corrida {
  constructor(genoma, pista, opcoes = {}) {
    this.f = { ...FISICA, ...(opcoes.fisica || {}) };
    this.pararAoCapotar = !!opcoes.pararAoCapotar;
    this.genoma = genoma;
    this.pista = pista;
    this.forma = decodificar(genoma);
    this.mundo = new World({ gravity: new Vec2(0, this.f.gravidade) });
    const chao = this.mundo.createBody();
    const pts = [[-6, 8], ...pista.pontos].map(([x, y]) => new Vec2(x, y));
    chao.createFixture(new Chain(pts, false), { friction: this.f.atritoChao });
    this._montarCarro();
    this.tempo = 0;
    this.maxX = this.xInicial;
    this.xCapotou = null;
    this.capotou = false;
    this.chegou = false;
    this.terminou = false;
    this.motivo = null;
    this._marcoX = this.maxX;
    this._marcoT = 0;
  }

  _montarCarro() {
    const { vertices, rodas, densCarroceria, densRoda } = this.forma;
    let fundo = 0;
    for (const r of rodas) fundo = Math.min(fundo, vertices[r.vertice][1] - r.raio);
    for (const [, y] of vertices) fundo = Math.min(fundo, y);
    const pos = new Vec2(0, -fundo + 0.3);
    this.carroceria = this.mundo.createBody({ type: 'dynamic', position: pos });
    for (let i = 0; i < vertices.length; i++) {
      const a = vertices[i], b = vertices[(i + 1) % vertices.length];
      this.carroceria.createFixture(
        new Polygon([new Vec2(0, 0), new Vec2(a[0], a[1]), new Vec2(b[0], b[1])]),
        { density: densCarroceria, friction: 0.6, filterGroupIndex: -1 },
      );
    }
    this.rodas = rodas.map((r) => {
      const [vx, vy] = vertices[r.vertice];
      const c = new Vec2(pos.x + vx, pos.y + vy);
      const corpo = this.mundo.createBody({ type: 'dynamic', position: c });
      corpo.createFixture(new Circle(r.raio), { density: densRoda, friction: this.f.atritoRoda, filterGroupIndex: -1 });
      this.mundo.createJoint(new RevoluteJoint({
        enableMotor: true, motorSpeed: -this.f.velMotor, maxMotorTorque: this.f.torqueMotor,
      }, this.carroceria, corpo, c));
      return corpo;
    });
    this.xInicial = pos.x;
  }

  /** Avança um passo de física. Devolve false quando a corrida terminou. */
  passo() {
    if (this.terminou) return false;
    const f = this.f;
    this.mundo.step(f.dt, f.iterVel, f.iterPos);
    this.tempo += f.dt;
    const p = this.carroceria.getPosition();
    if (p.x > this.maxX) this.maxX = p.x;
    if (!this.capotou) {
      const a = this.carroceria.getAngle();
      const ang = atan2(sin(a), cos(a));
      if (Math.abs(ang) > f.anguloCapotou) {
        this.capotou = true;
        this.xCapotou = this.maxX;
        if (this.pararAoCapotar) return this._fim('capotou');
      }
    }
    if (this.maxX >= this.pista.chegada) { this.chegou = true; return this._fim('chegou'); }
    if (this.maxX > this._marcoX + 0.3) { this._marcoX = this.maxX; this._marcoT = this.tempo; }
    if (this.tempo - this._marcoT > f.janelaParado) return this._fim('parou');
    if (this.tempo >= f.tempoMax) return this._fim('tempo');
    if (p.y < -500) return this._fim('caiu');
    return true;
  }

  _fim(motivo) { this.terminou = true; this.motivo = motivo; return false; }

  resultado() {
    return {
      maxX: this.maxX, tempo: this.tempo, capotou: this.capotou,
      xCapotou: this.capotou ? this.xCapotou : null, chegou: this.chegou, motivo: this.motivo,
    };
  }
}

/** Corre um carro até o fim, sem desenhar. */
export function correr(genoma, pista, opcoes = {}) {
  const c = new Corrida(genoma, pista, opcoes);
  while (c.passo());
  const r = c.resultado();
  r.passos = Math.round(r.tempo / c.f.dt);
  return r;
}

/** Aptidão de um genoma numa ou em várias pistas (média). */
export function avaliar(genoma, pistas, aptidao = 'robusta') {
  const lista = Array.isArray(pistas) ? pistas : [pistas];
  let soma = 0;
  const corridas = lista.map((p) => {
    const r = correr(genoma, p, { pararAoCapotar: aptidao === 'robusta' });
    soma += APTIDOES[aptidao](r);
    return r;
  });
  return { aptidao: soma / lista.length, corridas };
}
