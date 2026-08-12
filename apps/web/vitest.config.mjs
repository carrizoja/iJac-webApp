import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const publicEnvModule = fileURLToPath(new URL('./src/test/public-env.ts', import.meta.url));

export default defineConfig({
  plugins: [
    {
      name: 'test-public-env',
      enforce: 'pre',
      resolveId(id) {
        return id === 'astro:env/client' ? publicEnvModule : null;
      },
    },
  ],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
