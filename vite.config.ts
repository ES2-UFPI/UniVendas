/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // US16: o manifesto que o celular lê para instalar o UniVendas como app, em tela cheia.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: '/',
        name: 'UniVendas',
        short_name: 'UniVendas',
        description: 'Encontre os vendedores do campus da UFPI',
        lang: 'pt-BR',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        // Abre sem a barra do navegador, como um app (US16).
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        // O Android pede PNG de 192 e 512; o "maskable" deixa margem para ele recortar em círculo.
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
