// 针对构建产物 dist/lite-qs.mjs 的功能测试。
import assert from 'node:assert/strict';
import { parse, stringify } from '../dist/lite-qs.mjs';

let passed = 0;
function eq(actual, expected, label) {
  assert.deepStrictEqual(actual, expected, label);
  passed++;
}

// ---------- parse ----------
eq(parse('a=1&b=2'), { a: '1', b: '2' }, 'basic');
eq(parse('?a=1'), { a: '1' }, 'leading ?');
eq(parse('#a=1'), { a: '1' }, 'leading #');
eq(parse('a[b]=1'), { a: { b: '1' } }, 'nested 1 level');
eq(parse('a[]=1&a[]=2'), { a: ['1', '2'] }, 'brackets array');
eq(parse('a=1&a=2'), { a: ['1', '2'] }, 'repeated scalar -> array');
eq(parse('a=1&a=2', { arrayFormat: 'repeat' }), { a: ['1', '2'] }, 'repeat array');
eq(parse('a[]=1', { arrayFormat: 'repeat' }), { 'a[]': '1' }, 'repeat keeps literal brackets');
eq(parse('a=%E4%B8%AD&b=hello+world'), { a: '中', b: 'hello world' }, 'decode + space');
eq(parse('flag'), { flag: '' }, 'key without =');
eq(parse(''), {}, 'empty string');
eq(parse('a=1&'), { a: '1' }, 'trailing &');
eq(parse('a=%E4'), { a: '%E4' }, 'malformed percent does not throw');
eq(parse('a=1&b=2', {}), { a: '1', b: '2' }, 'explicit options');
eq(parse('a[b][c]=1'), { 'a[b][c]': '1' }, '>2 levels treated as flat (unsupported)');

// 原型污染防护
eq(({}).polluted, undefined, 'global prototype clean before');
parse('__proto__[polluted]=1');
parse('constructor[prototype][polluted2]=1');
parse('a[__proto__]=1');
eq(({}).polluted, undefined, 'no pollution via __proto__');
eq(({}).polluted2, undefined, 'no pollution via constructor.prototype');

// ---------- stringify ----------
eq(stringify({ a: 1, b: 2 }), 'a=1&b=2', 'stringify basic');
eq(stringify({ a: 'x y' }), 'a=x%20y', 'stringify encodes');
eq(stringify({ a: { b: 1 } }), 'a%5Bb%5D=1', 'stringify nested');
eq(stringify({ a: [1, 2] }), 'a%5B%5D=1&a%5B%5D=2', 'stringify brackets');
eq(stringify({ a: [1, 2] }, { arrayFormat: 'repeat' }), 'a=1&a=2', 'stringify repeat');
eq(stringify({ a: [1, 2] }, { arrayFormat: 'comma' }), 'a=1,2', 'stringify comma');
eq(stringify({ a: null, b: undefined, c: 1 }), 'c=1', 'skip null/undefined');
eq(stringify({ a: [] }), '', 'skip empty array');
eq(stringify({}), '', 'empty object');
eq(stringify(null), '', 'non-object -> empty');
eq(stringify({ a: true, b: 0 }), 'a=true&b=0', 'booleans and zero');

// stringify 侧的原型污染防护（JSON.parse 会创建自有 __proto__ 键）
const own = JSON.parse('{"__proto__":1,"ok":2}');
eq(stringify(own), 'ok=2', 'skip dangerous own key');
const nested = { a: JSON.parse('{"__proto__":1,"b":2}') };
eq(stringify(nested), 'a%5Bb%5D=2', 'skip dangerous nested key');

// ---------- round-trip ----------
eq(
  parse(stringify({ a: [1, 2], b: { c: 'x' }, d: 'y z' })),
  { a: ['1', '2'], b: { c: 'x' }, d: 'y z' },
  'round-trip'
);

console.log(`index.test.mjs: ${passed} assertions passed`);
