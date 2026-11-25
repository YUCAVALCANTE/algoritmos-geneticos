// Copia o planck.js (ESM) para web/vendor/ trocando Math.sin, Math.cos e Math.atan2
// pelas versões determinísticas de web/src/dmath.js. Assim a física dá exatamente
// o mesmo resultado no Node e em qualquer navegador.
//
// Uso:  npm pack planck@1.5.1 && tar -xzf planck-1.5.1.tgz
//       node scripts/vendorizar-planck.mjs package/dist/planck.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const origem = process.argv[2] || 'node_modules/planck/dist/planck.mjs';
let src = readFileSync(origem, 'utf8');
const antes = (src.match(/Math\.(sin|cos|atan2)\b/g) || []).length;
src = src.replace(/Math\.(sin|cos|atan2)\b/g, (_, f) => `dmath_${f}`);
const cabecalho = `// planck.js 1.5.1 (MIT, ver planck-LICENSE.txt) com Math.sin/cos/atan2 trocados por\n`
  + `// funções determinísticas. Gerado por scripts/vendorizar-planck.mjs; não edite à mão.\n`
  + `import { sin as dmath_sin, cos as dmath_cos, atan2 as dmath_atan2 } from '../src/dmath.js';\n`;
writeFileSync('web/vendor/planck.mjs', cabecalho + src);
console.log(`${antes} chamadas substituídas`);
