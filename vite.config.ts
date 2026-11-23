import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  base: './',
  build: { outDir: mode === 'crazygames' || mode === 'admob' ? `dist-${mode}` : 'dist' },
}))
