import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Los mp3 de src/audio/fonemas son ~1700 archivos cortos; sin esto Vite embebe en
  // base64 los menores a 4kb dentro del bundle JS principal en vez de servirlos como
  // archivos aparte que el navegador pide solo cuando efectivamente se reproducen.
  build: {
    assetsInlineLimit: 0,
  },
})
