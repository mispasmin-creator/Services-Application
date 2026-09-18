import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // ⚡ Build optimization
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, passes: 2 },
      mangle: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split vendors into separate chunks for better caching
          if (id.includes('node_modules/react')) return 'vendor-react';
          if (id.includes('node_modules/zustand')) return 'vendor-zustand';
          if (id.includes('node_modules/lucide-react')) return 'vendor-ui';
          if (id.includes('node_modules/framer-motion')) return 'vendor-ui';
          if (id.includes('node_modules/recharts')) return 'vendor-ui';
          if (id.includes('node_modules/react-hook-form')) return 'vendor-forms';
          if (id.includes('node_modules/react-router-dom')) return 'vendor-router';
        }
      }
    },
    // Disable CSS inlining for large apps
    cssCodeSplit: true,
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable compression
    reportCompressedSize: false,
  },

  // ⚡ Dev server optimization
  server: {
    middlewareMode: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    }
  }
})
