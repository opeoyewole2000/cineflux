import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/rd-oauth': {
        target: 'https://api.real-debrid.com/oauth/v2',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/rd-oauth/, ''),
      },
    },
  },
})
