import { NavLink } from "react-router-dom"

import { ConnectButton } from "@/components/connect-button"

import { ROUTES } from "@/lib/nav"
import { cn } from "@/lib/utils"

/**
 * The bar.
 *
 * Dark brown rather than black: it and the footer are the two heaviest points
 * on the page, and keeping them brown leaves pure black to mean structure.
 *
 * The wordmark is the one thing set in the pixel face. The links are the same
 * bold monospace the section headings use, so the nav reads as a row of
 * labels rather than as a second logotype competing with the first.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-bar text-ground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <NavLink to="/" className="pixel-type text-lg text-ground hover:text-tan">
          planckbits
        </NavLink>

        <nav className="order-3 flex w-full flex-wrap items-center gap-1 py-1 md:order-none md:w-auto md:flex-nowrap md:gap-1.5">
          {ROUTES.map((r) => (
            <NavLink
              key={r.path}
              to={r.path}
              end={r.path === "/"}
              className={({ isActive }) =>
                cn(
                  "shrink-0 px-2 py-1 text-xs font-bold tracking-wide",
                  // The current page inverts to a solid bone block. On a dark
                  // bar a colour shift alone is easy to miss.
                  isActive
                    ? "bg-ground text-bar"
                    : "text-ground/60 hover:bg-ground/15 hover:text-ground",
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
