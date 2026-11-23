import { svelte } from "@sveltejs/vite-plugin-svelte"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [svelte()],
  base: process.env.VITE_BASE ?? "/",
  server: {
    port: 4178,
    host: "0.0.0.0",
    strictPort: true,
  },
  preview: {
    port: 4178,
    host: "0.0.0.0",
    strictPort: true,
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
})
