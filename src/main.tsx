import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, HashRouter } from "react-router-dom"

import { App } from "@/App"
import "@/index.css"

/*
 * The standalone single-file build has no server to rewrite deep links, so
 * it routes on the hash instead. Everything else is identical.
 */
const Router = import.meta.env.VITE_HASH_ROUTER === "1" ? HashRouter : BrowserRouter

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
)
