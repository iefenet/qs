// 构建产物完整性测试：CJS / UMD / min UMD 三种入口 + 核心源码约束检查。
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let passed = 0;
function ok(cond, label) {
  assert.ok(cond, label);
  passed++;
}

// CJS：Node.js / 小程序 require
const cjs = require('../dist/iefe-qs.cjs');
ok(typeof cjs.parse === 'function' && typeof cjs.stringify === 'function', 'cjs exports');
assert.deepStrictEqual(cjs.parse('a=1&b=2'), { a: '1', b: '2' });
passed++;

// UMD / min UMD：在孤立全局上下文中模拟 <script> 引入
for (const file of ['dist/iefe-qs.umd.js', 'dist/iefe-qs.min.js']) {
  const code = readFileSync(path.join(root, file), 'utf8');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  ok(typeof ctx.iefeQs === 'object', `${file} sets global iefeQs`);
  ok(typeof ctx.iefeQs.parse === 'function', `${file} iefeQs.parse`);
  // vm 上下文中的对象原型与主上下文不同，用 JSON 比较结果值。
  assert.strictEqual(JSON.stringify(ctx.iefeQs.parse('a[b]=1&c[]=2')), '{"a":{"b":"1"},"c":["2"]}');
  passed++;
  assert.strictEqual(ctx.iefeQs.stringify({ a: [1, 2] }), 'a%5B%5D=1&a%5B%5D=2');
  passed++;
}

// min 产物确实是压缩过的（体积明显更小）
const umdSize = readFileSync(path.join(root, 'dist/iefe-qs.umd.js'), 'utf8').length;
const minSize = readFileSync(path.join(root, 'dist/iefe-qs.min.js'), 'utf8').length;
ok(minSize < umdSize, 'min.js smaller than umd.js');

// 核心源码约束：无环境全局变量、无 Node 内置模块、无 Function 构造器。
// 先去掉注释，约束只针对可执行代码。
const rawSrc = readFileSync(path.join(root, 'src/index.js'), 'utf8');
const src = rawSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const forbidden = ['window', 'document', 'navigator', 'process', 'globalThis', 'require', 'import ', 'Function('];
for (const word of forbidden) {
  ok(!src.includes(word), `src must not reference "${word}"`);
}
ok(!/\bglobal\b/.test(src), 'src must not reference global');
ok(!/from\s+['"]/.test(src) && !/require\(/.test(src), 'src must not import modules');

console.log(`dist.test.mjs: ${passed} assertions passed`);
