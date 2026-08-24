const NAV = [
  { href: "#floor", label: "FLOOR" },
  { href: "#desks", label: "DESKS" },
  { href: "#roster", label: "ROSTER" },
  { href: "#record", label: "RECORD" },
  { href: "#how", label: "HOW IT WORKS" },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-ground/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3">
        <a href="#top" className="font-display text-lg tracking-tight">
          PLANCKOBITS
        </a>
        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-xs tracking-widest text-ink-muted uppercase hover:text-cobalt"
            >
              {n.label}
            </a>
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
