import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-framework': ['react', 'react-dom', 'react-router-dom', '@reduxjs/toolkit', 'react-redux'],
          'vendor-ui': ['lucide-react', 'react-icons', 'framer-motion', 'react-toastify'],
          'vendor-stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js', '@stripe/connect-js', '@stripe/react-connect-js'],
          'vendor-swiper': ['swiper'],
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
          'vendor-date': ['moment-timezone'],
          'vendor-utils': ['axios', 'socket.io-client'],
        },
      },
    },
  },
})
