# @iefe/qs

极简、零依赖、跨平台的 query string 工具库，只有两个纯函数：`parse` 和 `stringify`。

- **零环境依赖**：核心代码不出现 `window`、`document`、`global`、`process`、`navigator`、`Function` 构造器等任何环境全局变量。
- **零 Node.js 内置模块依赖**：不使用 `querystring`、`url`、`path` 等模块。
- **纯函数**：`parse` / `stringify` 的输入输出只依赖参数，不读取任何外部状态。
- 因此可在**微信小程序**、**uni-app（含非 H5 端）**、**Node.js**、**浏览器 H5** 中直接运行。
- 自带**原型污染防护**（过滤 `__proto__` / `constructor` / `prototype`）。
- 提供 CJS / ESM / UMD（未压缩 / 压缩）四种分发产物。

## 安装

```bash
npm install @iefe/qs
```

## 快速上手

```js
import { parse, stringify } from '@iefe/qs';

parse('a=1&b=2');                          // { a: '1', b: '2' }
parse('a[b]=1');                           // { a: { b: '1' } }
parse('a[]=1&a[]=2');                      // { a: ['1', '2'] }
parse('a=1&a=2', { arrayFormat: 'repeat' }); // { a: ['1', '2'] }

stringify({ a: 1, b: 2 });                          // 'a=1&b=2'
stringify({ a: { b: 1 } });                         // 'a%5Bb%5D=1'
stringify({ a: [1, 2] });                           // 'a%5B%5D=1&a%5B%5D=2'
stringify({ a: [1, 2] }, { arrayFormat: 'repeat' }); // 'a=1&a=2'
stringify({ a: [1, 2] }, { arrayFormat: 'comma' });  // 'a=1,2'
stringify({ a: null, b: undefined, c: 1 });          // 'c=1'
```

## API

### `parse(str, options?)`

把 query string 解析为对象。**值一律保持字符串，不做类型转换。**

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `str` | `string` | 待解析的字符串，允许带前导 `?` 或 `#`。传入 `null` / `undefined` / `''` 返回 `{}`。 |
| `options.arrayFormat` | `'brackets' \| 'repeat'` | 默认 `'brackets'`，识别 `a[]=1&a[]=2`。设为 `'repeat'` 时按重复键 `a=1&a=2` 识别数组。 |

- 自动 `decodeURIComponent`，并把 `+` 解析为空格；遇到非法百分号序列不抛异常，原样返回。
- 重复的标量键会累积为数组：`a=1&a=2` → `{ a: ['1', '2'] }`。
- 自动过滤 `__proto__`、`constructor`、`prototype`，防止原型污染。

### `stringify(obj, options?)`

把对象序列化为 query string，默认对键和值做 `encodeURIComponent` 编码。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `obj` | `object` | 待序列化的对象。非对象返回 `''`。 |
| `options.arrayFormat` | `'brackets' \| 'repeat' \| 'comma'` | 默认 `'brackets'` → `a[]=1&a[]=2`；`'repeat'` → `a=1&a=2`；`'comma'` → `a=1,2`。 |

- 嵌套对象输出为 `a[b]=1` 形式。
- 值为 `undefined` 或 `null` 的键会被跳过；空数组也会被跳过。
- 同样过滤 `__proto__`、`constructor`、`prototype` 键。

## 各平台使用方式

### 1. Node.js / Vue / React

```js
// ESM
import { parse, stringify } from '@iefe/qs';
// CommonJS
const { parse, stringify } = require('@iefe/qs');
```

`package.json` 已配置 `main` / `module` / `exports`，Node 与各类打包器会自动选择对应产物。

### 2. uni-app

通过 npm 安装后：

- **H5 端和 App 端**可直接 `import { parse, stringify } from '@iefe/qs'` 使用。
- **编译到小程序端前**，只需确认没有引入任何浏览器专属代码 —— 本库核心逻辑天然满足（源码不含 `window` / `document` 等）。
- 如果运行到小程序模拟器时遇到 `node_modules` 被清除、找不到包的情况，请在**微信开发者工具的终端**中单独执行 `npm install`，然后点击菜单「工具 → 构建 npm」。

### 3. 微信小程序原生开发

```bash
npm install @iefe/qs
```

然后在微信开发者工具中点击「工具 → 构建 npm」，之后即可：

```js
const { parse, stringify } = require('@iefe/qs');
```

### 4. 浏览器 CDN

```html
<script src="https://unpkg.com/@iefe/qs"></script>
<script>
  // 全局变量 window.iefeQs
  var params = iefeQs.parse('a=1&b=2'); // { a: '1', b: '2' }
</script>
```

- 默认加载压缩版（`unpkg` / `jsdelivr` 字段指向 `dist/iefe-qs.min.js`）。
- 调试时可手动改为 `https://unpkg.com/@iefe/qs/dist/iefe-qs.umd.js` 获取未压缩、可读的源码版本。
- ⚠️ **此方式仅限 H5**；小程序和 uni-app 的非 H5 端不可用（它们没有 `<script>` 与全局 `window`）。

## 明确不支持的功能

以下功能**有意不实现**，以保持体积与行为可预期：

- **超过 2 层的嵌套**：只支持 `a[b]=1`。`a[b][c]=1` 会被当作字面量键 `{ 'a[b][c]': '1' }`，序列化侧不会输出三层。
- **`allowDots`**：不支持 `a.b=1` 这种点号语法。
- **字符集探测**：不做 `charset` 判断，一律按 UTF-8 + `decodeURIComponent` 处理。
- **自定义解码器 / 编码器**：不提供 `decoder` / `encoder` 选项。

## 构建

```bash
npm install
npm run build
```

产物：

| 文件 | 格式 | 说明 |
| --- | --- | --- |
| `dist/iefe-qs.cjs` | CommonJS | 未压缩，供 Node.js / 小程序 `require`。 |
| `dist/iefe-qs.mjs` | ES Module | 未压缩，供 Vue / React / uni-app `import`。 |
| `dist/iefe-qs.umd.js` | UMD | 未压缩，供调试或需要可读源码的 CDN 场景。 |
| `dist/iefe-qs.min.js` | UMD | 压缩混淆，供生产环境 CDN / `<script>`。 |

## 测试

```bash
npm test
```

## License

MIT
