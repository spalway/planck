import { NavLink } from "react-router-dom"

import { ConnectButton } from "@/components/connect-button"

import { ROUTES } from "@/lib/nav"
import { cn } from "@/lib/utils"

/**
 * The black bar.
 *
 * The heaviest thing on the page, and deliberately so — it and the footer
 * bracket a pale body, which is what stops a bone-on-bone site reading as
 * washed out. Everything in here is set in the pixel face.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-ink text-ground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <NavLink
          to="/"
          className="pixel-type text-lg text-ground hover:text-tan"
        >
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
                  "pixel-type shrink-0 border-2 px-2 py-1 text-[0.7rem]",
                  // The current page inverts to a solid bone block. On a black
                  // bar a colour shift is nearly invisible; a filled block is
                  // not, and it matches the tags used elsewhere.
                  isActive
                    ? "border-ground bg-ground text-ink"
                    : "border-transparent text-ground/65 hover:border-ground hover:text-ground",
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
