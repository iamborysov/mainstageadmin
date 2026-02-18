import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize chunk size
    rollupOptions: {
      output: {
        manualChunks: {
          // Firebase in separate chunk
          'firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          // UI components
          'ui': ['@radix-ui/react-tabs', '@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-checkbox'],
          // Charts and visualization
          'viz': ['recharts'],
          // Date handling
          'date': ['date-fns'],
          // Utils
          'utils': ['lucide-react', 'clsx', 'tailwind-merge'],
        },
      },
    },
    // Reduce chunk size warning
    chunkSizeWarningLimit: 1000,
    // Minimize build (use esbuild which is faster and default in Vite)
    minify: true,
  },
  server: {
    allowedHosts: [
      '.ngrok-free.app',
      '.ngrok-free.dev',
      '.ngrok.io',
      'localhost',
    ],
  },
})
