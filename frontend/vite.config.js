import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function checkEnvPlugin(env) {
  return {
    name: 'check-env',
    buildStart() {
      const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_API_URL']
      const placeholders = ['placeholder', 'your-project', 'your-publishable-key']
      const missing = []
      for (const key of required) {
        const val = env[key]
        if (!val || placeholders.some(p => val.includes(p))) {
          missing.push(key)
        }
      }
      if (missing.length > 0) {
        throw new Error(
          `\n\n❌ BUILD BLOCCATO: variabili d'ambiente mancanti o non configurate:\n` +
          missing.map(k => `   - ${k}`).join('\n') +
          `\n\nCrea il file frontend/.env copiando frontend/.env.example e compila i valori reali.\n`
        )
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
    checkEnvPlugin(env),
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      includeAssets: ['favicon.png', 'favicon.svg', 'icons/*.png'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['icons/icon-1024x1024.png'],
      },
      manifest: {
        name: 'Piky',
        short_name: 'Piky',
        description: 'Organizza il compleanno del tuo bambino',
        theme_color: '#4A7A50',
        background_color: '#FAF7F2',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'it',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-1024x1024.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any',
          },
        ],
        categories: ['lifestyle', 'social'],
      },
    }),
  ],
  build: {
    target: ['es2015', 'safari13'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  }
})
