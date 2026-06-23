import deno from "@deno/vite-plugin";
import { defineConfig } from "vite";

const viteConfig = defineConfig({
  plugins: [deno()],
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
});

export default viteConfig;
