import { NavLink } from "react-router-dom"

import { ConnectButton } from "@/components/connect-button"

import { ROUTES } from "@/lib/nav"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-umber bg-ground/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <NavLink to="/" className="font-brand text-lg tracking-tight">
          PLANCKBITS
        </NavLink>

        <nav className="order-3 flex w-full flex-wrap items-center gap-1.5 py-1 md:order-none md:w-auto md:flex-nowrap md:gap-2">
          {ROUTES.map((r) => (
            <NavLink
              key={r.path}
              to={r.path}
              end={r.path === "/"}
              className={({ isActive }) =>
                cn(
                  "shrink-0 border-2 px-2 py-1 text-xs tracking-widest uppercase",
                  // The active page is a filled block, not a colour change —
                  // at this size a tint alone is easy to miss on a phone.
                  isActive
                    ? "border-umber bg-umber text-ground"
                    : "border-transparent text-ink-muted hover:border-umber hover:text-cobalt",
                )
              }
            >
              {r.label}
            </NavLink>
          ))}
        </nav>

        <ConnectButton />
      </div>
    </header>
  )
}
