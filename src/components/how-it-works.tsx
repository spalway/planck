import { Link } from "react-router-dom"

import { STEPS } from "@/lib/how-it-works-steps"

/**
 * How it works, set as a documentation page.
 *
 * It used to be the same six steps as a grid of cards, which is a summary —
 * fine as a section on a landing page, wrong as the destination of a nav link
 * called "How It Works". A reader who clicks that wants to read, in order,
 * and to be able to link a friend at step four.
 *
 * So: a breadcrumb, a title, a lead, a contents list, and one section per
 * step with its own anchor. Every heading is a link to itself, which is the
 * one documentation affordance people actually reach for.
 *
 * Set in the site's own blocky monospace rather than a docs-site sans. The
 * structure is borrowed; the surface is not.
 */
export function HowItWorks() {
  return (
    <article className="py-14">
      <p className="text-[0.65rem] tracking-widest text-ink-muted">
        docs <span aria-hidden="true">/</span> how it works
      </p>

      <h1 className="mt-3 font-display text-3xl leading-tight font-bold">
        How it works
      </h1>

      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted">
        A broker is minted, takes a desk, and is hired. The hiring fee is the
        only thing that moves — it pays his owner, funds the vault, and burns
        supply. What the vault buys, it keeps.
      </p>

      {/* The contents list is the part that makes this read as documentation
          rather than as a long page. Six links, in order, above the fold. */}
      <nav
        aria-label="On this page"
        className="panel-sunk mt-8 px-4 py-3.5 sm:max-w-md"
      >
        <h2 className="text-[0.6rem] tracking-widest text-ink-muted">
          On this page
        </h2>
        <ol className="mt-2.5 flex flex-col gap-1.5">
          {STEPS.map((s) => (
            <li key={s.slug}>
              <a
                href={`#${s.slug}`}
                className="flex items-baseline gap-2.5 text-xs hover:text-cobalt"
              >
                <span className="num shrink-0 text-ink-muted">{s.n}</span>
                <span className="font-bold underline decoration-ink/25 underline-offset-2">
                  {s.title}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {STEPS.map((s) => (
        <section
          key={s.slug}
          id={s.slug}
          // scroll-mt clears the sticky bar, or an anchor jump lands with the
          // heading hidden underneath it.
          className="group mt-8 scroll-mt-24 border-t-2 border-ink/15 pt-8"
        >
          <h2 className="font-display text-xl leading-snug font-bold">
            <a href={`#${s.slug}`} className="flex items-baseline gap-2.5">
              <span className="num text-sm text-ink-muted">{s.n}</span>
              <span>{s.title}</span>
              <span
                aria-hidden="true"
                className="text-base text-cobalt opacity-0 transition-opacity group-hover:opacity-100"
              >
                #
              </span>
            </a>
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
            {s.body}
          </p>
        </section>
      ))}

      {/* A note block, the way a docs page carries one. It restates step six,
          which is the claim the whole thing rests on. */}
      <aside className="mt-10 border-l-4 border-cobalt bg-tan/40 px-4 py-3.5">
        <h2 className="text-[0.6rem] tracking-widest text-ink">Note</h2>
        <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-ink-muted">
          A track record here is arithmetic, not a claim we make: live price
          against the basis stamped when the vault bought. Every number on this
          site can be checked against public data.
        </p>
      </aside>

      <nav
        aria-label="Next"
        className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/15 pt-6"
      >
        <span className="text-[0.65rem] tracking-widest text-ink-muted">
          Next
        </span>
        <Link to="/mint" className="btn btn-primary px-5 py-2.5 text-xs">
          Mint a broker
        </Link>
      </nav>
    </article>
  )
}
