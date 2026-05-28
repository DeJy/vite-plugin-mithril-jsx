import type { Plugin, UserConfig } from 'vite';
import { version as viteVersion } from 'vite';

// Resolved at module load — one detection per process, not per build.
const VITE_MAJOR = parseInt(viteVersion.split('.')[0], 10);

export interface MithrilJsxOptions {
  /**
   * JSX factory function name.
   * Must be available as a global (or imported) in every file that uses JSX.
   *
   * With Mithril the standard is `m` (the hyperscript function).
   * @default 'm'
   */
  pragma?: string;

  /**
   * JSX fragment factory name.
   * The plugin automatically maps this identifier to Mithril's fragment
   * selector `'['` via Vite's `define` — no entry-file setup required.
   *
   * @default 'mFrag'
   */
  pragmaFrag?: string;

  /**
   * Enable JSX parsing in plain `.js` and `.ts` files (not just `.jsx` / `.tsx`).
   *
   * By default, transformers (esbuild and OXC) only process JSX syntax in files
   * whose extension explicitly signals JSX (`.jsx`, `.tsx`). Set this to `true`
   * if your project uses `.js` files that contain JSX.
   *
   * Configures the right option per Vite version:
   * - Vite ≤ 6 (esbuild): sets `esbuild.include` to `/\.[jt]sx?$/`
   * - Vite 7+ (OXC): sets `oxc.include` to `/\.[jt]sx?$/`
   * - Pre-bundler (esbuild, Vite ≤ 6 default): sets `optimizeDeps.esbuildOptions.loader`
   * - Pre-bundler (rolldown, Vite 6+ experimental / Vite 7+): sets `moduleTypes`
   *
   * @default false
   */
  jsExtensions?: boolean;
}

/** Matches .js, .ts, .jsx, .tsx — used when jsExtensions is true. */
const JS_EXTENSIONS_FILTER = /\.[jt]sx?$/;

/**
 * Builds the Vite `UserConfig` fragment for the given Vite major version and
 * plugin options. Exported for testing; not part of the public API.
 *
 * @internal
 */
export function buildConfig(
  viteMajor: number,
  options: MithrilJsxOptions = {},
): UserConfig {
  const { pragma = 'm', pragmaFrag = 'mFrag', jsExtensions = false } = options;

  // Resolve the fragment identifier to Mithril's '[' at compile time.
  // This means users never need `globalThis.mFrag = '['` in their entry file.
  const defineConfig: UserConfig = {
    define: { [pragmaFrag]: JSON.stringify('[') },
  };

  // ── Rolldown / OXC (Vite 7+, and Vite 6 with experimental rolldown) ────
  const rolldownConfig: UserConfig = {
    // Top-level OXC transformer config (Vite 7+)
    // NOTE: development must stay false even in dev mode.
    // With runtime:'classic', development:true makes OXC inject __self and
    // __source props into every m() call. Mithril treats these as DOM
    // attributes and tries to JSON.stringify(__self) → circular reference.
    oxc: {
      // When jsExtensions is true, tell OXC to parse .js/.ts as JSX too.
      ...(jsExtensions ? { include: JS_EXTENSIONS_FILTER } : {}),
      jsx: {
        runtime: 'classic',
        pragma,
        pragmaFrag,
        development: false,
      },
    },
    // Pre-bundler (optimizeDeps) uses its own rolldown pipeline
    optimizeDeps: {
      rolldownOptions: {
        // When jsExtensions is true, tell rolldown to treat .js as jsx and
        // .ts as tsx so the pre-bundler also parses JSX in those files.
        ...(jsExtensions
          ? { moduleTypes: { '.js': 'jsx', '.ts': 'tsx' } }
          : {}),
        transform: {
          jsx: {
            runtime: 'classic',
            pragma,
            pragmaFrag,
          },
        },
      },
    },
  };

  // ── esbuild (Vite ≤ 5, and Vite 6 without experimental rolldown) ────────
  const esbuildConfig: UserConfig = {
    esbuild: {
      // When jsExtensions is true, tell esbuild to parse .js/.ts as JSX too.
      ...(jsExtensions ? { include: JS_EXTENSIONS_FILTER } : {}),
      jsxFactory: pragma,
      jsxFragment: pragmaFrag,
    },
    // When jsExtensions is true, configure the esbuild pre-bundler (Vite ≤ 6
    // default) to also treat .js/.ts files as JSX source.
    ...(jsExtensions
      ? {
          optimizeDeps: {
            esbuildOptions: {
              loader: { '.js': 'jsx', '.ts': 'tsx' },
            },
          },
        }
      : {}),
  };

  if (viteMajor >= 7) return { ...defineConfig, ...rolldownConfig };
  if (viteMajor === 6) {
    // Vite 6 can use either the default esbuild pre-bundler or the experimental
    // rolldown pre-bundler. Provide config for both and merge optimizeDeps so
    // neither esbuildOptions nor rolldownOptions is silently dropped.
    return {
      ...defineConfig,
      ...esbuildConfig,
      ...rolldownConfig,
      optimizeDeps: {
        ...esbuildConfig.optimizeDeps,
        ...rolldownConfig.optimizeDeps,
      },
    };
  }
  return { ...defineConfig, ...esbuildConfig }; // Vite ≤ 5
}

/**
 * Vite plugin that configures JSX for Mithril.js.
 *
 * Automatically adapts to the transformer used by the installed Vite version:
 *
 * | Vite version | Transformer            | Config applied                                     |
 * |--------------|------------------------|----------------------------------------------------|
 * | ≤ 5          | esbuild                | `esbuild.jsxFactory` / `esbuild.jsxFragment`       |
 * | 6            | esbuild **or** rolldown (experimental) | both configs                    |
 * | 7+           | rolldown / OXC         | `oxc.jsx` + `optimizeDeps.rolldownOptions`         |
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import mithrilJsx from 'vite-plugin-mithril-jsx';
 *
 * export default defineConfig({
 *   plugins: [mithrilJsx()],
 * });
 * ```
 */
export default function mithrilJsx(options: MithrilJsxOptions = {}): Plugin {
  return {
    name: 'vite-plugin-mithril-jsx',
    config(): UserConfig {
      return buildConfig(VITE_MAJOR, options);
    },
  };
}
