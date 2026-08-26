import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, HashRouter } from "react-router-dom"

import { App } from "@/App"
import { ErrorBoundary } from "@/components/error-boundary"
import "@/index.css"

/*
 * The standalone single-file build has no server to rewrite deep links, so
 * it routes on the hash instead. Everything else is identical.
 */
const Router = import.meta.env.VITE_HASH_ROUTER === "1" ? HashRouter : BrowserRouter

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/*
      An outer boundary, above App and above the router.

      The per-route boundary inside App cannot catch a crash in App itself.
      When the scroll effect there threw during unmount, there was nothing
      above it and React unmounted the root — a white page with no header,
      no nav and no way out. This is the floor: whatever else breaks, the
      visitor gets a message and a reload button instead of nothing.
    */}
    <ErrorBoundary>
      <Router>
        <App />
      </Router>
    </ErrorBoundary>
  </StrictMode>,
)
