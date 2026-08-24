import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

/** Everything inlined into one HTML file. See scripts/build-standalone.mjs. */
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
})
