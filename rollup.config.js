import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { babel } from '@rollup/plugin-babel';
import packageJson from './package.json' with { type: 'json' };

export default {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    sourcemap: true,
    format: 'esm',
  },
  external: [...Object.keys(packageJson.dependencies)],
  plugins: [
    // nodeResolve({
    //   preferBuiltins: true,
    //   extensions: ['.ts'],
    //   exportConditions: ['node'],
    // }),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' }),
    babel({ babelHelpers: 'bundled' }),
    terser(),
  ],
};
