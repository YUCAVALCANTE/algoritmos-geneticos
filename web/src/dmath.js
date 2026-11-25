// Matemática determinística: sin, cos, atan2 e log escritos só com +, -, *, / e sqrt,
// que o IEEE 754 obriga a dar o mesmo resultado em qualquer motor JavaScript.
// Math.sin, Math.cos, Math.atan2 e Math.log são "aproximados pela implementação":
// Node e Chrome podem divergir no último bit, e numa simulação caótica isso basta
// para dois carros iguais chegarem a lugares diferentes. A física (planck.js, ver
// scripts/vendorizar-planck.mjs) e o resto do código usam estas funções.

const PIO2_1 = 1.57079632673412561417e+00;  // primeiros 33 bits de pi/2
const PIO2_1T = 6.07710050650619224932e-11; // pi/2 - PIO2_1
const INV_PIO2 = 6.36619772367581382433e-01;

// núcleos do fdlibm (|r| <= pi/4)
const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04,
  S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05,
  C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;

function kSin(x) {
  const z = x * x;
  return x + x * z * (S1 + z * (S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)))));
}
function kCos(x) {
  const z = x * x;
  return 1 - 0.5 * z + z * z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
}

function reduzir(x) {
  const k = Math.round(x * INV_PIO2);         // round é exato
  const r = (x - k * PIO2_1) - k * PIO2_1T;
  return [r, ((k % 4) + 4) % 4];
}

export function sin(x) {
  if (!isFinite(x)) return NaN;
  const [r, q] = reduzir(x);
  return q === 0 ? kSin(r) : q === 1 ? kCos(r) : q === 2 ? -kSin(r) : -kCos(r);
}

export function cos(x) {
  if (!isFinite(x)) return NaN;
  const [r, q] = reduzir(x);
  return q === 0 ? kCos(r) : q === 1 ? -kSin(r) : q === 2 ? -kCos(r) : kSin(r);
}

const PI = 3.141592653589793, PI_2 = 1.5707963267948966;

// atan para |x| <= 1: duas reduções pela meia-tangente e série de Taylor curta.
function atanCurto(x) {
  let y = x / (1 + Math.sqrt(1 + x * x));
  y = y / (1 + Math.sqrt(1 + y * y));       // |y| <= tan(pi/16) ~ 0.199
  const z = y * y;
  let s = 0;
  for (let n = 25; n >= 1; n -= 2) s = 1 / n - z * s;
  return 4 * y * s;
}

export function atan(x) {
  if (x !== x) return NaN;
  if (x > 1) return PI_2 - atanCurto(1 / x);
  if (x < -1) return -PI_2 - atanCurto(1 / x);
  return atanCurto(x);
}

export function atan2(y, x) {
  if (x !== x || y !== y) return NaN;
  if (x === 0 && y === 0) return 0;
  if (x === 0) return y > 0 ? PI_2 : -PI_2;
  const a = atan(y / x);
  if (x > 0) return a;
  return y >= 0 ? a + PI : a - PI;
}

const LN2 = 0.6931471805599453, SQRT2 = 1.4142135623730951;

/** Logaritmo natural (x > 0). */
export function log(x) {
  if (!(x > 0)) return x === 0 ? -Infinity : NaN;
  let e = 0;
  while (x >= SQRT2) { x /= 2; e++; }        // divisões por 2 são exatas
  while (x < SQRT2 / 2) { x *= 2; e--; }
  const s = (x - 1) / (x + 1), z = s * s;   // |s| <= 0.172
  let soma = 0;
  for (let n = 41; n >= 1; n -= 2) soma = 1 / n + z * soma;
  return e * LN2 + 2 * s * soma;
}
