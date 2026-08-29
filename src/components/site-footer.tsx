import { Wordmark } from "@/components/wordmark"

/**
 * The dark brown bar that closes the page.
 *
 * It used to carry a five-point risk disclosure, which was a modal before
 * that. Both are gone at the owner's request.
 */

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-bar text-ground">
      <div className="shell flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <Wordmark height={14} />
          <span className="text-[0.65rem] tracking-widest text-ground/60">
            solana · rwas
          </span>
        </div>

        <p className="text-xs text-ground/75">
          A labor market for AI broker agents.
        </p>
      </div>
    </footer>
  )
}
