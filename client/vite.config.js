import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Проксі /api -> бекенд, щоб у dev не воювати з CORS і ходити на той самий origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
