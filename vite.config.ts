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
  // host:true binds 0.0.0.0 rather than just [::1]. Without it Vite listens
  // on IPv6 loopback only, and a browser resolving localhost to 127.0.0.1
  // gets connection refused. It also exposes the server on the LAN, so the
  // site can be opened on a phone.
  // /api is served by server/index.mjs, which holds the secrets. Proxying in
  // dev means the frontend only ever calls same-origin paths, exactly as in
  // production.
  server: {
    port: 5190,
    host: true,
    proxy: { "/api": { target: "http://127.0.0.1:3000", changeOrigin: true } },
  },
  preview: { port: 5190, host: true },
})
