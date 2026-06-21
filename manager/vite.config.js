import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Окремий застосунок панелі менеджера. Працює на порту 5174,
// але ходить у той самий backend API (:4000), що й лендінг.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
