import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { babel } from '@rollup/plugin-babel';

export default {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    sourcemap: true,
    format: 'esm',
  },
  plugins: [
    nodeResolve({
      preferBuiltins: true,
      extensions: ['.ts'],
      exportConditions: ['node'],
    }),
    commonjs(),
    babel({ babelHelpers: 'bundled' }),
    terser(),
    typescript({ tsconfig: './tsconfig.json' }),
  ],
};
