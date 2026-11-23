import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

export default defineConfig(({ command, mode }) => ({
  base: './',
  build: { outDir: ['crazygames', 'playgama', 'admob'].includes(mode) ? `dist-${mode}` : 'dist' },
  plugins: [{
    name: 'build-html',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (mode === 'crazygames' || mode === 'playgama') {
          return html.replace('<html lang="id">', '<html lang="en">')
        }
        if (command !== 'build' || mode !== 'production') return html
        // Keep the supplied tag inert until the game is ready and the host matches.
        return html.replace('</head>', `  <template id="pages-analytics">
      <script defer src="https://cloud.umami.is/script.js" data-website-id="2479dffc-2df8-4616-9cd7-b2384a0f9409" data-domains="projekpod.github.io"></script>
    </template>
  </head>`)
      },
    },
  }, ...(mode === 'playgama' ? [{
    name: 'playgama-config',
    generateBundle() {
      const fileName = 'playgama-bridge-config.json'
      const source = readFileSync(new URL(fileName, import.meta.url))
      this.emitFile({ type: 'asset', fileName, source })
    },
  } satisfies Plugin] : [])],
}))
