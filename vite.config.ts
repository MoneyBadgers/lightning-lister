// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    vue(),
    nodePolyfills({
      // enable polyfills for `buffer`, `process`, `stream`, etc.
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      // make sure imports of 'buffer' resolve to the polyfill package
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['bolt11', 'buffer'],
  },
  base: '/lightning-lister/'
})
