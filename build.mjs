// lite-qs 构建脚本（esbuild）。
// 产出：
//   dist/lite-qs.cjs     CommonJS，未压缩（Node.js / 小程序 require）
//   dist/lite-qs.mjs     ES Module，未压缩（Vue / React / uni-app import）
//   dist/lite-qs.umd.js  UMD，未压缩（调试 / 可读源码的 CDN）
//   dist/lite-qs.min.js  UMD，压缩混淆（生产环境 CDN / <script>）
import { build } from 'esbuild';

// esbuild 没有原生 UMD 格式，用 banner/footer 把 CJS 产物包一层 UMD 外壳。
const UMD_BANNER = `(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') { module.exports = factory(); }
  else if (typeof define === 'function' && define.amd) { define([], factory); }
  else { root.liteQs = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  var module = { exports: {} };
  var exports = module.exports;
`;

const UMD_FOOTER = `
  return module.exports;
});
`;

const common = {
  entryPoints: ['src/index.js'],
  bundle: true,
  logLevel: 'info',
};

await build({ ...common, format: 'cjs', outfile: 'dist/lite-qs.cjs' });
await build({ ...common, format: 'esm', outfile: 'dist/lite-qs.mjs' });
await build({
  ...common,
  format: 'cjs',
  outfile: 'dist/lite-qs.umd.js',
  banner: { js: UMD_BANNER },
  footer: { js: UMD_FOOTER },
});
await build({
  ...common,
  format: 'cjs',
  outfile: 'dist/lite-qs.min.js',
  banner: { js: UMD_BANNER },
  footer: { js: UMD_FOOTER },
  minify: true,
  legalComments: 'none',
});

console.log('lite-qs build done: dist/lite-qs.{cjs,mjs,umd.js,min.js}');
