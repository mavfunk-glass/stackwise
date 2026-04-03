import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientPkg = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf-8')) as {
  version: string;
};

/**
 * Optional build-time override (CI/host env). Otherwise full semver from package.json.
 * Label is always V + semver, e.g. V1.0.7, V2.0.0 (bump major/minor in client/package.json yourself).
 */
const override = process.env.STACKWISE_APP_VERSION_OVERRIDE?.trim();
const appVersionLabel = override ? `V${override.replace(/^v/i, '')}` : `V${clientPkg.version}`;

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersionLabel),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'StackWise: Personalized Supplement Stack',
        short_name: 'StackWise',
        description:
          'AI-powered supplement recommendations with buy links. Add to Home Screen for an app-like experience.',
        theme_color: '#0F1F3D',
        background_color: '#F5F7FA',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'browser'],
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['health', 'lifestyle', 'shopping'],
        icons: [
          {
            src: '/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

