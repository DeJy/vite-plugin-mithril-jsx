import { describe, it, expect } from 'vitest';
import mithrilJsx, { buildConfig } from '../src/index';

// ─── Shared helpers ──────────────────────────────────────────────────────────

const JS_EXT_FILTER = /\.[jt]sx?$/;

/** The define block expected for a given pragmaFrag. */
function expectedDefineConfig(pragmaFrag: string) {
  return { define: { [pragmaFrag]: JSON.stringify('[') } };
}

/** The rolldown/OXC config expected for a given pragma pair. */
function expectedRolldownConfig(
  pragma: string,
  pragmaFrag: string,
  jsExtensions = false,
) {
  return {
    ...expectedDefineConfig(pragmaFrag),
    oxc: {
      ...(jsExtensions ? { include: JS_EXT_FILTER } : {}),
      jsx: { runtime: 'classic', pragma, pragmaFrag, development: false },
    },
    optimizeDeps: {
      rolldownOptions: {
        ...(jsExtensions
          ? { moduleTypes: { '.js': 'jsx', '.ts': 'tsx' } }
          : {}),
        transform: {
          jsx: { runtime: 'classic', pragma, pragmaFrag },
        },
      },
    },
  };
}

/** The esbuild config expected for a given pragma pair. */
function expectedEsbuildConfig(
  pragma: string,
  pragmaFrag: string,
  jsExtensions = false,
) {
  return {
    ...expectedDefineConfig(pragmaFrag),
    esbuild: {
      ...(jsExtensions ? { include: JS_EXT_FILTER } : {}),
      jsxFactory: pragma,
      jsxFragment: pragmaFrag,
    },
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
}

// ─── buildConfig ─────────────────────────────────────────────────────────────

describe('buildConfig', () => {
  // ── Vite 5 ────────────────────────────────────────────────────────────────
  describe('Vite 5 (esbuild)', () => {
    it('returns only an esbuild block', () => {
      const cfg = buildConfig(5);
      expect(cfg).not.toHaveProperty('oxc');
      expect(cfg).not.toHaveProperty('optimizeDeps');
      expect(cfg).toHaveProperty('esbuild');
    });

    it('uses default pragma / pragmaFrag', () => {
      expect(buildConfig(5)).toEqual(expectedEsbuildConfig('m', 'mFrag'));
    });

    it('respects custom pragma', () => {
      expect(buildConfig(5, { pragma: 'h' })).toEqual(
        expectedEsbuildConfig('h', 'mFrag'),
      );
    });

    it('respects custom pragmaFrag', () => {
      expect(buildConfig(5, { pragmaFrag: 'Fragment' })).toEqual(
        expectedEsbuildConfig('m', 'Fragment'),
      );
    });

    it('jsExtensions: false (default) — no include or optimizeDeps', () => {
      const cfg = buildConfig(5, { jsExtensions: false });
      expect(cfg.esbuild).not.toHaveProperty('include');
      expect(cfg).not.toHaveProperty('optimizeDeps');
    });

    it('jsExtensions: true — adds include to esbuild and loader to optimizeDeps.esbuildOptions', () => {
      const cfg = buildConfig(5, { jsExtensions: true });
      expect(cfg.esbuild).toHaveProperty('include', JS_EXT_FILTER);
      expect(cfg.optimizeDeps?.esbuildOptions).toHaveProperty('loader', {
        '.js': 'jsx',
        '.ts': 'tsx',
      });
    });

    it('jsExtensions: true — still carries pragma values', () => {
      expect(buildConfig(5, { pragma: 'h', jsExtensions: true })).toEqual(
        expectedEsbuildConfig('h', 'mFrag', true),
      );
    });
  });

  // ── Vite 6 ────────────────────────────────────────────────────────────────
  describe('Vite 6 (esbuild + rolldown experimental)', () => {
    it('returns both esbuild and rolldown/OXC blocks', () => {
      const cfg = buildConfig(6);
      expect(cfg).toHaveProperty('esbuild');
      expect(cfg).toHaveProperty('oxc');
      expect(cfg).toHaveProperty('optimizeDeps');
    });

    it('uses default pragma / pragmaFrag everywhere', () => {
      expect(buildConfig(6)).toEqual({
        ...expectedDefineConfig('mFrag'),
        ...expectedEsbuildConfig('m', 'mFrag'),
        ...expectedRolldownConfig('m', 'mFrag'),
      });
    });

    it('respects custom pragma in both blocks', () => {
      expect(buildConfig(6, { pragma: 'h' })).toMatchObject({
        esbuild: { jsxFactory: 'h' },
        oxc: { jsx: { pragma: 'h' } },
        optimizeDeps: { rolldownOptions: { transform: { jsx: { pragma: 'h' } } } },
      });
    });

    it('jsExtensions: false — no include, moduleTypes, or esbuildOptions anywhere', () => {
      const cfg = buildConfig(6, { jsExtensions: false });
      expect(cfg.esbuild).not.toHaveProperty('include');
      expect(cfg.oxc).not.toHaveProperty('include');
      expect(cfg.optimizeDeps?.rolldownOptions).not.toHaveProperty('moduleTypes');
      expect(cfg.optimizeDeps).not.toHaveProperty('esbuildOptions');
    });

    it('jsExtensions: true — adds include to esbuild and oxc, moduleTypes to rolldown, loader to esbuildOptions', () => {
      const cfg = buildConfig(6, { jsExtensions: true });
      expect(cfg.esbuild).toHaveProperty('include', JS_EXT_FILTER);
      expect(cfg.oxc).toHaveProperty('include', JS_EXT_FILTER);
      expect(cfg.optimizeDeps?.rolldownOptions).toHaveProperty('moduleTypes', {
        '.js': 'jsx',
        '.ts': 'tsx',
      });
      expect(cfg.optimizeDeps?.esbuildOptions).toHaveProperty('loader', {
        '.js': 'jsx',
        '.ts': 'tsx',
      });
    });
  });

  // ── Vite 7 ────────────────────────────────────────────────────────────────
  describe('Vite 7+ (OXC / rolldown)', () => {
    it('returns only rolldown/OXC blocks — no esbuild', () => {
      const cfg = buildConfig(7);
      expect(cfg).not.toHaveProperty('esbuild');
      expect(cfg).toHaveProperty('oxc');
      expect(cfg).toHaveProperty('optimizeDeps');
    });

    it('uses default pragma / pragmaFrag', () => {
      expect(buildConfig(7)).toEqual(expectedRolldownConfig('m', 'mFrag'));
    });

    it('respects custom pragma', () => {
      expect(buildConfig(7, { pragma: 'h' })).toMatchObject({
        oxc: { jsx: { pragma: 'h' } },
        optimizeDeps: { rolldownOptions: { transform: { jsx: { pragma: 'h' } } } },
      });
    });

    it('respects custom pragmaFrag', () => {
      expect(buildConfig(7, { pragmaFrag: 'Fragment' })).toMatchObject({
        oxc: { jsx: { pragmaFrag: 'Fragment' } },
        optimizeDeps: {
          rolldownOptions: { transform: { jsx: { pragmaFrag: 'Fragment' } } },
        },
      });
    });

    it('always sets oxc.jsx.development to false', () => {
      expect(buildConfig(7)).toMatchObject({ oxc: { jsx: { development: false } } });
      expect(buildConfig(7, { jsExtensions: true })).toMatchObject({
        oxc: { jsx: { development: false } },
      });
    });

    it('always sets oxc.jsx.runtime to classic', () => {
      expect(buildConfig(7)).toMatchObject({ oxc: { jsx: { runtime: 'classic' } } });
    });

    it('jsExtensions: false (default) — no include, no moduleTypes', () => {
      const cfg = buildConfig(7, { jsExtensions: false });
      expect(cfg.oxc).not.toHaveProperty('include');
      expect(cfg.optimizeDeps?.rolldownOptions).not.toHaveProperty('moduleTypes');
    });

    it('jsExtensions: true — adds include to oxc', () => {
      const cfg = buildConfig(7, { jsExtensions: true });
      expect(cfg.oxc).toHaveProperty('include', JS_EXT_FILTER);
    });

    it('jsExtensions: true — adds moduleTypes to optimizeDeps.rolldownOptions', () => {
      const cfg = buildConfig(7, { jsExtensions: true });
      expect(cfg.optimizeDeps?.rolldownOptions).toHaveProperty('moduleTypes', {
        '.js': 'jsx',
        '.ts': 'tsx',
      });
    });

    it('jsExtensions: true — still carries pragma values', () => {
      expect(
        buildConfig(7, { pragma: 'h', pragmaFrag: 'Frag', jsExtensions: true }),
      ).toEqual(expectedRolldownConfig('h', 'Frag', true));
    });

    it('also applies to Vite 8 (and any future major ≥ 7)', () => {
      const cfg7 = buildConfig(7);
      const cfg8 = buildConfig(8);
      expect(cfg8).toEqual(cfg7);
    });
  });

  // ── Default options ────────────────────────────────────────────────────────
  describe('default options (called with no arguments)', () => {
    it('Vite 5: pragma=m, pragmaFrag=mFrag, no jsExtensions', () => {
      expect(buildConfig(5)).toEqual(expectedEsbuildConfig('m', 'mFrag'));
    });

    it('Vite 7: pragma=m, pragmaFrag=mFrag, no jsExtensions', () => {
      expect(buildConfig(7)).toEqual(expectedRolldownConfig('m', 'mFrag'));
    });
  });
});

// ─── mithrilJsx plugin ───────────────────────────────────────────────────────

describe('mithrilJsx (plugin)', () => {
  it('has the correct plugin name', () => {
    expect(mithrilJsx().name).toBe('vite-plugin-mithril-jsx');
  });

  it('has enforce: "pre" so the transform runs before vite:build-import-analysis', () => {
    expect(mithrilJsx().enforce).toBe('pre');
  });

  it('exposes a config hook', () => {
    expect(typeof mithrilJsx().config).toBe('function');
  });

  it('exposes a transform hook', () => {
    expect(typeof mithrilJsx().transform).toBe('function');
  });

  it('transform hook returns null when jsExtensions is false', async () => {
    const plugin = mithrilJsx({ jsExtensions: false });
    const transform = plugin.transform as (code: string, id: string) => Promise<unknown>;
    expect(await transform('<div/>', '/src/foo.js')).toBeNull();
  });

  it('transform hook skips .jsx and .tsx files even when jsExtensions is true', async () => {
    const plugin = mithrilJsx({ jsExtensions: true });
    const transform = plugin.transform as (code: string, id: string) => Promise<unknown>;
    expect(await transform('<div/>', '/src/foo.jsx')).toBeNull();
    expect(await transform('<div/>', '/src/foo.tsx')).toBeNull();
  });

  it('transform hook skips files without JSX (no "<")', async () => {
    const plugin = mithrilJsx({ jsExtensions: true });
    const transform = plugin.transform as (code: string, id: string) => Promise<unknown>;
    expect(await transform('export const x = 1', '/src/foo.js')).toBeNull();
  });

  it('config hook returns an object (smoke test against installed Vite)', () => {
    const plugin = mithrilJsx();
    // config() takes no required arguments in the hook signature we use
    const result = (plugin.config as () => object)();
    expect(result).toBeTypeOf('object');
    expect(result).not.toBeNull();
  });

  it('config hook forwards options to the returned config', () => {
    const plugin = mithrilJsx({ pragma: 'h', pragmaFrag: 'Fragment' });
    const result = (plugin.config as () => Record<string, unknown>)();
    // Whatever Vite major is installed, pragma values should appear somewhere
    const str = JSON.stringify(result);
    expect(str).toContain('"h"');
    expect(str).toContain('"Fragment"');
  });
});
