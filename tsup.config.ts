import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'style/index': 'src/style/index.ts',
    'engine/index': 'src/engine/index.ts',
    'components/index': 'src/components/index.ts',
    'pipeline/index': 'src/pipeline/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: false,
  clean: true,
  sourcemap: true,
  splitting: true,
  treshake: true,
});
