/**
 * @iefe/qs —— 极简、零依赖、跨平台的 query string 工具库。
 *
 * 核心约束：不引用任何环境全局变量（window / document / global / process /
 * navigator / Function 构造器等），不引用任何 Node.js 内置模块，全部为纯函数，
 * 因此可在微信小程序、uni-app（含非 H5 端）、Node.js、浏览器 H5 中运行。
 *
 * @module @iefe/qs
 */

/** 需要过滤的危险键名，用于防止原型污染。 */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * 判断键名是否会污染原型链。
 * @param {string} key 待判断的键名。
 * @returns {boolean} 危险返回 true。
 */
function isDangerousKey(key) {
  return DANGEROUS_KEYS.indexOf(key) !== -1;
}

/**
 * 仅检查自有属性，避免读到原型链上的键。
 * @param {object} obj 目标对象。
 * @param {string} key 键名。
 * @returns {boolean} 是自有属性返回 true。
 */
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * 解析 URI 组件：`+` 先还原为空格，再做 decodeURIComponent；
 * 解码失败（如非法百分号序列）时返回原字符串，不抛异常。
 * @param {string} str 待解码的字符串。
 * @returns {string} 解码结果。
 */
function decode(str) {
  const s = str.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(s);
  } catch (e) {
    return s;
  }
}

/**
 * 编码为可安全放入 query string 的字符串。
 * @param {string} str 待编码字符串。
 * @returns {string} 编码结果。
 */
function encode(str) {
  return encodeURIComponent(str);
}

/**
 * 将任意值转为字符串（数组/对象由调用方保证不会走到这里）。
 * @param {*} value 待转换的值。
 * @returns {string} 字符串形式。
 */
function toStr(value) {
  return typeof value === 'string' ? value : String(value);
}

/**
 * 把已解码的键拆成路径片段，仅支持最多 2 层：`a[b]` → ['a', 'b']，`a[]` → ['a', '']。
 * 层级超过 2 层或语法非法时，整串原样作为单层键返回（该情况明确不支持）。
 * @param {string} key 已解码的键。
 * @returns {string[]} 路径片段数组。
 */
function parseKey(key) {
  const open = key.indexOf('[');
  if (open === -1) return [key];
  const segs = [key.slice(0, open)];
  let i = open;
  while (i < key.length) {
    if (key.charAt(i) !== '[') return [key];
    const close = key.indexOf(']', i + 1);
    if (close === -1) return [key];
    segs.push(key.slice(i + 1, close));
    i = close + 1;
  }
  if (segs.length !== 2 || segs[0] === '') return [key];
  return segs;
}

/**
 * 标量写入：键不存在则赋值，已存在则与旧值合并为数组。
 * @param {object} target 目标对象。
 * @param {string} key 键名。
 * @param {string} value 值。
 */
function setValue(target, key, value) {
  if (!hasOwn(target, key)) {
    target[key] = value;
  } else if (Array.isArray(target[key])) {
    target[key].push(value);
  } else {
    target[key] = [target[key], value];
  }
}

/**
 * 把一对键值写入结果对象，处理 `a[b]=1` 与 `a[]=1` 两种语法。
 * @param {object} result 结果对象。
 * @param {string[]} segs parseKey 输出的路径片段。
 * @param {string} value 值。
 */
function assign(result, segs, value) {
  const head = segs[0];
  if (isDangerousKey(head)) return;
  if (segs.length === 1) {
    setValue(result, head, value);
    return;
  }
  const child = segs[1];
  if (isDangerousKey(child)) return;
  if (child === '') {
    const cur = hasOwn(result, head) ? result[head] : undefined;
    if (Array.isArray(cur)) cur.push(value);
    else if (cur === undefined) result[head] = [value];
    else result[head] = [cur, value];
    return;
  }
  let parent = hasOwn(result, head) ? result[head] : undefined;
  if (parent === null || typeof parent !== 'object' || Array.isArray(parent)) {
    parent = {};
    result[head] = parent;
  }
  setValue(parent, child, value);
}

/**
 * 将 query string 解析为对象。值一律保持字符串，不做类型转换。
 *
 * @param {string} str 待解析的 query string，可带前导 `?` 或 `#`。
 * @param {object} [options] 解析选项。
 * @param {'brackets'|'repeat'} [options.arrayFormat='brackets'] 数组语法：
 *   `'brackets'` 识别 `a[]=1&a[]=2`；`'repeat'` 识别重复键 `a=1&a=2`。
 * @returns {Object<string, *>} 解析结果（普通对象）。
 * @example
 * parse('a=1&b=2');               // { a: '1', b: '2' }
 * parse('a[b]=1');                // { a: { b: '1' } }
 * parse('a[]=1&a[]=2');           // { a: ['1', '2'] }
 */
export function parse(str, options) {
  const opts = options || {};
  const arrayFormat = opts.arrayFormat === 'repeat' ? 'repeat' : 'brackets';
  const result = {};
  if (str === null || str === undefined) return result;
  let input = String(str);
  if (input.charAt(0) === '?' || input.charAt(0) === '#') input = input.slice(1);
  if (input === '') return result;
  const pairs = input.split('&');
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    if (pair === '') continue;
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? '' : pair.slice(eq + 1);
    const key = decode(rawKey);
    if (key === '') continue;
    const segs = arrayFormat === 'repeat' ? [key] : parseKey(key);
    assign(result, segs, decode(rawValue));
  }
  return result;
}

/**
 * 追加单个键值对（数组、嵌套对象、标量三种情况）。
 * @param {string[]} parts 输出片段累加器。
 * @param {string} key 键名。
 * @param {*} value 值。
 * @param {string} arrayFormat 数组格式。
 */
function appendValue(parts, key, value, arrayFormat) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    const items = [];
    for (let i = 0; i < value.length; i++) {
      if (value[i] === null || value[i] === undefined) continue;
      items.push(toStr(value[i]));
    }
    if (items.length === 0) return;
    if (arrayFormat === 'comma') {
      const encoded = [];
      for (let i = 0; i < items.length; i++) encoded.push(encode(items[i]));
      parts.push(encode(key) + '=' + encoded.join(','));
    } else if (arrayFormat === 'repeat') {
      for (let i = 0; i < items.length; i++) parts.push(encode(key) + '=' + encode(items[i]));
    } else {
      for (let i = 0; i < items.length; i++) parts.push(encode(key + '[]') + '=' + encode(items[i]));
    }
    return;
  }
  if (typeof value === 'object') {
    const subKeys = Object.keys(value);
    for (let i = 0; i < subKeys.length; i++) {
      const sub = subKeys[i];
      if (isDangerousKey(sub)) continue;
      const sv = value[sub];
      if (sv === null || sv === undefined) continue;
      parts.push(encode(key + '[' + sub + ']') + '=' + encode(toStr(sv)));
    }
    return;
  }
  parts.push(encode(key) + '=' + encode(toStr(value)));
}

/**
 * 将对象序列化为 query string，键和值默认做 encodeURIComponent 编码。
 *
 * @param {Object<string, *>} obj 待序列化的对象。
 * @param {object} [options] 序列化选项。
 * @param {'brackets'|'repeat'|'comma'} [options.arrayFormat='brackets'] 数组格式：
 *   `'brackets'` → `a[]=1&a[]=2`；`'repeat'` → `a=1&a=2`；`'comma'` → `a=1,2`。
 * @returns {string} 序列化结果；值等于 undefined 或 null 的键会被跳过。
 * @example
 * stringify({ a: 1, b: 2 });                          // 'a=1&b=2'
 * stringify({ a: { b: 1 } });                         // 'a%5Bb%5D=1'
 * stringify({ a: [1, 2] }, { arrayFormat: 'repeat' }); // 'a=1&a=2'
 */
export function stringify(obj, options) {
  const opts = options || {};
  const arrayFormat = opts.arrayFormat || 'brackets';
  if (obj === null || typeof obj !== 'object') return '';
  const parts = [];
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (isDangerousKey(key)) continue;
    appendValue(parts, key, obj[key], arrayFormat);
  }
  return parts.join('&');
}
