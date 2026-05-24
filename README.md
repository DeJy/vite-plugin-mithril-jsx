# vite-plugin-mithril-jsx

[![npm version](https://img.shields.io/npm/v/vite-plugin-mithril-jsx)](https://www.npmjs.com/package/vite-plugin-mithril-jsx)
[![license](https://img.shields.io/npm/l/vite-plugin-mithril-jsx)](./LICENSE)

Vite plugin that configures JSX for [Mithril.js](https://mithril.js.org/) — works with **all Vite versions**, automatically adapting to the underlying transformer (esbuild or rolldown/OXC).

| Vite version | Transformer | Config applied |
|---|---|---|
| ≤ 5 | esbuild | `esbuild.jsxFactory` / `esbuild.jsxFragment` |
| 6 | esbuild *(or rolldown experimental)* | both configs |
| 7+ | rolldown / OXC | `oxc.jsx` + `optimizeDeps.rolldownOptions` |

## Installation

```bash
npm install -D vite-plugin-mithril-jsx
```

## Usage

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import mithrilJsx from 'vite-plugin-mithril-jsx';

export default defineConfig({
  plugins: [mithrilJsx()],
});
```

That's it. No `esbuild`, `oxc`, or `optimizeDeps` blocks needed — the plugin injects the right config for your Vite version.

### Options

```ts
mithrilJsx({
  pragma:     'm',     // JSX factory   (default: 'm')
  pragmaFrag: 'mFrag', // JSX fragment  (default: 'mFrag')
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `pragma` | `string` | `'m'` | JSX factory — must be a global or import available in every JSX file |
| `pragmaFrag` | `string` | `'mFrag'` | JSX fragment factory — must resolve to Mithril's `'['` selector at runtime |

## Prerequisites

The pragma names must be available as **globals** at runtime. Add this to your entry point (e.g. `main.js`):

```js
import m from 'mithril';

globalThis.m     = m;
globalThis.mFrag = '['; // Mithril uses the CSS selector '[' as a fragment
```

> **Why `'['`?** Mithril's hyperscript function `m(selector, ...)` accepts CSS selectors as the first argument. `'['` selects `<div>` with no attributes — it is the idiomatic Mithril fragment.

## Example

```jsx
// No import needed — m and mFrag are globals
export default function HelloWorld() {
  return (
    <>
      <h1>Hello, Mithril!</h1>
      <p>JSX works with no React in sight.</p>
    </>
  );
}
```

Compiles to:

```js
export default function HelloWorld() {
  return m('[',
    m('h1', 'Hello, Mithril!'),
    m('p', 'JSX works with no React in sight.')
  );
}
```

## License

MIT © [Dominic Jean](https://github.com/DeJy)
