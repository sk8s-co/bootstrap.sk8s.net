import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  target: 'node18',
  format: ['cjs'],
  clean: true,
  sourcemap: true,
  minify: false,
  loader: {
    '.hbs': 'text',
    '.md': 'text',
    '.css': 'text',
    '.yaml': 'text',
  },
});
