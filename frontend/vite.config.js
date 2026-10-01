import { defineConfig } from 'vite';

export default defineConfig({
  preview: {
    allowedHosts: [
      'graduation-project-frontend.up.railway.app',
      ...(process.env.RAILWAY_PUBLIC_DOMAIN ? [process.env.RAILWAY_PUBLIC_DOMAIN] : []),
    ],
  },
});
