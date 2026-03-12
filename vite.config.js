import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/studydeck/',   // ← CHANGE THIS to your GitHub repo name
})
