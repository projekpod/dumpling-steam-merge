import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  base: './',
  build: { outDir: ['crazygames', 'playgama', 'admob'].includes(mode) ? `dist-${mode}` : 'dist' },
  plugins: mode === 'playgama' ? [{
    name: 'playgama-config',
    generateBundle() {
      const fileName = 'playgama-bridge-config.json'
      const source = readFileSync(new URL(fileName, import.meta.url))
      this.emitFile({ type: 'asset', fileName, source })
    },
  }] : [],
}))
