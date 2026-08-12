import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'static',
  env: {
    schema: {
      PUBLIC_FIREBASE_API_KEY: envField.string({
        context: 'client',
        access: 'public',
        min: 1,
      }),
      PUBLIC_FIREBASE_AUTH_DOMAIN: envField.string({
        context: 'client',
        access: 'public',
        min: 3,
        includes: '.',
      }),
      PUBLIC_FIREBASE_PROJECT_ID: envField.string({
        context: 'client',
        access: 'public',
        min: 1,
      }),
      PUBLIC_FIREBASE_APP_ID: envField.string({
        context: 'client',
        access: 'public',
        min: 1,
      }),
      PUBLIC_API_URL: envField.string({
        context: 'client',
        access: 'public',
        url: true,
      }),
    },
  },
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  server: {
    port: 4321,
  },
  vite: {
    envPrefix: 'PUBLIC_',
  },
});
