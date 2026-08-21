import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    global: {}
  },
  optimizeDeps: {
    include: ['ketcher-react', 'ketcher-core', 'ketcher-core > ajv', '@babel/runtime/regenerator'],
    exclude: ['ketcher-standalone'] // it manages its own WASM/worker loading
  },
  worker: {
    format: 'es'
  },
  build: {
    commonjsOptions: {
      include: [/ketcher/, /node_modules/]
    }
  }
})