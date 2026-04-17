import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'StellarSplit - Social Settlements',
        short_name: 'StellarSplit',
        description: 'Decentralized group expense splitting and settlement app built on Stellar.',
        theme_color: '#6366f1',
        background_color: '#0a0a0b',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5000000,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20 } },
          },
        ],
      },
    }),
  ],
  build: {
    // Warn when any individual chunk exceeds 500 kB (gzipped ~150 kB)
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Split vendor code into stable, cache-friendly chunks.
        // IMPORTANT: keep chunk boundaries narrow to avoid circular chunks.
        // All react-adjacent packages go in the SAME chunk as their dependents.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          // Stellar SDK + Freighter — largest single chunk
          if (id.includes('@stellar/') || id.includes('@creit.tech/')) return 'vendor-stellar';
          // Chart library
          if (id.includes('recharts') || id.includes('/d3-')) return 'vendor-charts';
          // Animation library
          if (id.includes('framer-motion')) return 'vendor-motion';
          // Everything else (react, react-dom, router, all other deps) into one chunk
          // to avoid circular dependency issues between react and non-react vendor code.
          return 'vendor';
        },
      },
    },
  },
  optimizeDeps: {
    include: ['recharts'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Avoid CORS when fetching XLM price from CoinGecko in dev
      '/api/coingecko': {
        target: 'https://api.coingecko.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coingecko/, ''),
      },
    },
  },
})
