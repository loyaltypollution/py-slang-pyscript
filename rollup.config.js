import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from '@rollup/plugin-typescript';

export default [{
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'iife',
      sourcemap: true
    },
    plugins: [typescript(), nodeResolve()]
  }, {
    input: 'src/python/python-evaluator.ts',
    output: {
      file: 'dist/pyscript-evaluator.cjs',
      format: 'cjs',
      sourcemap: true
    },
    plugins: [typescript(), nodeResolve()]
  }];