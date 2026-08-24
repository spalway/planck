import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // fileURLToPath, not URL.pathname — the latter yields "/C:/..." on
      // Windows and resolution silently fails.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { port: 5190 },
  preview: { port: 5190 },
})
