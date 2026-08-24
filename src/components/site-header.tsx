import { NavLink } from "react-router-dom"

import { ROUTES } from "@/lib/nav"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-ground/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <NavLink to="/" className="font-display text-lg tracking-tight">
          PLANCKOBITS
        </NavLink>

        <nav className="order-3 flex w-full items-center gap-5 overflow-x-auto md:order-none md:w-auto">
          {ROUTES.map((r) => (
            <NavLink
              key={r.path}
              to={r.path}
              end={r.path === "/"}
              className={({ isActive }) =>
                cn(
                  "shrink-0 text-xs tracking-widest uppercase hover:text-cobalt",
                  isActive ? "text-cobalt" : "text-ink-muted"
                )
              }
            >
              {r.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          disabled
          className="cursor-not-allowed border border-ink/25 px-3 py-1.5 text-xs tracking-widest text-ink-muted uppercase"
        >
          Connect · soon
        </button>
      </div>
    </header>
  )
}
