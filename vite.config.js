import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Allows relative asset paths for both Web and Electron file:// loading
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false
  }
})
