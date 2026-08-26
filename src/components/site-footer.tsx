import { Wordmark } from "@/components/wordmark"
import { RISK_POINTS } from "@/lib/risk"

/**
 * The black bar that closes the page.
 *
 * It also carries the risk disclosure. That used to be a modal you had to
 * agree to before the site would render; the modal is gone, but the text is
 * not — a tokenized-equity site that says nothing about restriction or loss
 * is worse than one that says it quietly at the foot of every page.
 */

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-bar text-ground">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-6 px-3 py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <Wordmark height={16} />
          <span className="text-[0.65rem] tracking-widest text-ground/60">
            solana · rwas
          </span>
        </div>

        <p className="text-xs text-ground/75">
          A labor market for AI broker agents.
        </p>

        <ul className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-x-8 gap-y-2">
          {RISK_POINTS.map((p) => (
            <li
              key={p}
              className="border-l-2 border-ground/25 pl-3 text-[0.7rem] leading-relaxed text-ground/55"
            >
              {p}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
