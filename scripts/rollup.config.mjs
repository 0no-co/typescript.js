import * as path from 'path';
import * as url from 'url';

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import sucrase from '@rollup/plugin-sucrase';
import strip from '@rollup/plugin-strip';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const jsPlugins = [
  {
    resolveId(source, importer) {
      switch (source) {
        case '@microsoft/typescript-etw':
        case 'perf_hooks':
        case 'os':
        case 'fs':
        case 'path':
        case 'buffer':
          return path.resolve(__dirname, '../src/noop_module.mjs');
        default:
          if (importer) {
            const target = path.join(path.dirname(importer), source);
            switch (true) {
              case target.endsWith('cancellationToken/cancellationToken'):
              case target.endsWith('executeCommandLine/executeCommandLine'):
              case target.endsWith('watchGuard/watchGuard'):
              case target.endsWith('executeCommandLine/_namespaces/ts'):
              case target.endsWith('deprecatedCompat/_namespaces/ts'):
                return path.resolve(__dirname, '../src/noop_module.mjs');
              case target.endsWith('compiler/factory/emitHelpers'):
                return path.resolve(__dirname, '../src/compiler_factory_emitHelpers.mjs');
              case target.endsWith('compiler/transformer'):
                return path.resolve(__dirname, '../src/compiler_transformer.mjs');
              case target.endsWith('compiler/builder'):
                return path.resolve(__dirname, '../src/compiler_builder.mjs');
              case target.endsWith('compiler/watch'):
                return path.resolve(__dirname, '../src/compiler_watch.mjs');
              case target.endsWith('compiler/watchUtilities'):
                return path.resolve(__dirname, '../src/compiler_watchUtilities.mjs');
              case target.endsWith('compiler/sys'):
                return path.resolve(__dirname, '../src/compiler_sys.mjs');
              case target.endsWith('compiler/performance'):
                return path.resolve(__dirname, '../src/compiler_performance.mjs');
              case target.endsWith('compiler/_namespaces/ts'):
                return path.resolve(__dirname, '../src/index.ts');
              default:
                return null;
            }
          }
          return null;
      }
    }
  },

  resolve({
    extensions: ['.mjs', '.js', '.ts', '.json'],
    mainFields: ['module', 'jsnext', 'main'],
    preferBuiltins: false,
    browser: true,
  }),

  commonjs({
    ignoreGlobal: true,
    include: /\/node_modules\//,
    extensions: ['.mjs', '.js'],
  }),

  sucrase({
    transforms: ['typescript'],
  }),

  strip({
    functions: [
      'console.*',
      'performance.mark',
      'performance.measure',
      'performance.timeOrigin',
      'performance.now',
      'performance.clearMarks',
      'performance.clearMeasures',
      'ts.performance.*',
      'perfLogger.*',
    ]
  }),

  terser({
    warnings: true,
    ecma: 2015,
    keep_fnames: true,
    ie8: false,
    compress: {
      pure_getters: true,
      toplevel: true,
      booleans_as_integers: false,
      keep_fnames: true,
      keep_fargs: true,
      if_return: false,
      ie8: false,
      sequences: false,
      loops: false,
      conditionals: false,
      join_vars: false,
    },
    mangle: {
      module: true,
      keep_fnames: true,
    },
    output: {
      beautify: true,
      braces: true,
      indent_level: 2,
    },
  }),
];

const output = format => {
  const extension = format === 'esm' ? '.mjs' : '.js';
  return {
    minifyInternalExports: false,
    chunkFileNames: '[hash]' + extension,
    entryFileNames: '[name]' + extension,
    dir: './dist',
    exports: 'named',
    indent: false,
    freeze: false,
    strict: false,
    format,
    // NOTE: All below settings are important for cjs-module-lexer to detect the export
    // When this changes (and terser mangles the output) this will interfere with Node.js ESM intercompatibility
    esModule: format !== 'esm',
    externalLiveBindings: format !== 'esm',
    generatedCode: {
      preset: 'es5',
      reservedNamesAsProps: false,
      objectShorthand: false,
      constBindings: false,
    },
  };
};

const commonConfig = {
  input: {
    'typescript': './src/index.ts',
  },
  external: () => false,
  preserveSymlinks: true,
  treeshake: {
    unknownGlobalSideEffects: false,
    tryCatchDeoptimization: false,
    moduleSideEffects: false,
  },
};

const jsConfig = {
  ...commonConfig,
  plugins: jsPlugins,
  output: [
    output('esm'),
    output('cjs'),
  ],
};

const dtsConfig = {
  ...commonConfig,
  plugins: [
    dts(),
  ],
  output: {
    minifyInternalExports: false,
    dir: './dist',
    entryFileNames: '[name].d.ts',
    format: 'es',
  },
};

export default [
  jsConfig,
  dtsConfig,
];
