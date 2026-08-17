import { defineConfig } from "vite";

const viteConfig = defineConfig({
  optimizeDeps: {
    exclude: ["@dimforge/rapier3d"],
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
});

export default viteConfig;
