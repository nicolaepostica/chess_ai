import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  plugins: [react()],
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
  test: {
    environment: 'node',
    testTimeout: 60_000,
    setupFiles: ['./src/test-setup.ts'],
  },
})
