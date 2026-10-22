import { defineConfig } from 'vite'

// Relative base so the build works both on GitHub Pages (/json-editor/) and Vercel (/)
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1500 }
})
