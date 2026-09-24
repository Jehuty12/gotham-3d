import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three-core', test: /three[\\/]build[\\/]three.core.js/, priority: 2 },
            { name: 'three-renderer', test: /three[\\/]build[\\/]three.module.js/, priority: 1 },
          ],
        },
      },
    },
  },
  server: {
    watch: { ignored: ['**/*.local/**', '**/*.local.*'] },
  },
});
