import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// base: en GitHub Pages el sitio cuelga de /<repo>/
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icono.svg"],
      manifest: {
        name: "Patio en Vivo — Total Seafood",
        short_name: "Patio",
        description: "Hoja de patio y control de temperaturas, funciona sin señal.",
        lang: "es-EC",
        start_url: base,
        scope: base,
        display: "standalone",
        orientation: "any",
        background_color: "#15488B",
        theme_color: "#15488B",
        icons: [
          { src: "icono-192.png", sizes: "192x192", type: "image/png" },
          { src: "icono-512.png", sizes: "512x512", type: "image/png" },
          { src: "icono-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        navigateFallback: base + "index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
