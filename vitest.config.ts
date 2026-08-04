import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// M1-T05: separate from vite.config.ts (build config) so `npm run build`
// never picks up test-only settings. Same react() plugin so JSX/TSX in
// components under test compiles identically to the app build.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
