import { defineConfig } from 'astro/config';

export default defineConfig({
  server: { port: 4321 },
  vite: {
    build: { chunkSizeWarningLimit: 1200 },
  },
});
