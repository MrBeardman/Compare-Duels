import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' is required by CrazyGames: the bundle must use relative paths only.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
