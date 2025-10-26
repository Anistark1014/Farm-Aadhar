import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: true,
      protocol: 'ws',
      host: 'localhost',
      port: 8080,
    },
    watch: {
      usePolling: false, // Changed from true - reduces aggressive file watching
      ignored: ['**/node_modules/**', '**/.git/**'],
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Fix duplicate React instances
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  optimizeDeps: {
    // Force include these dependencies for pre-bundling
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@radix-ui/react-tooltip',
      '@tanstack/react-query',
    ],
    // Removed force: true to prevent constant re-bundling
  },
  // Ensure consistent module resolution
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
}));
