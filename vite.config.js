import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // strip all console.log in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Split vendor libs into separate cached chunks
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'motion': ['framer-motion'],
          'socket': ['socket.io-client'],
          'ui': ['lucide-react'],
          'state': ['zustand', 'axios'],
        },
      },
    },
    // Warn if any chunk exceeds 400kb
    chunkSizeWarningLimit: 400,
  },
})
