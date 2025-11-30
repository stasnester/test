import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Prevent errors with process.env usage in unused files
    'process.env': {} 
  }
});