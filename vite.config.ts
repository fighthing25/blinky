import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' wajib agar aset termuat lewat file:// di Electron
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
});
