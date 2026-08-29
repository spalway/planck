import { Link } from "react-router-dom"

/**
 * The floor with nobody on it.
 *
 * Two states share this: the roster loaded and is genuinely empty, and the
 * roster could not be loaded at all. Both used to replace the entire page
 * with one red sentence, which made a paused database look like a broken
 * site — no wordmark, no contract address, no way to mint.
 *
 * The sentence differs between the two on purpose. "Be the first" is a claim
 * about the floor being empty, and it must not be made when the truth is
 * that we could not read the floor.
 */

/** Enough blank slots to read as a floor rather than as a stalled skeleton. */
const SLOTS = 12

export function EmptyFloor({
  title = "The roster is empty",
  note = "No brokers have been minted yet. Be the first to take a desk.",
}: {
  title?: string
  note?: string
}) {
  return (
    <div className="flex flex-col gap-6">
      <ul
        aria-hidden="true"
        className="panel grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-0.5 bg-bar p-0"
      >
        {Array.from({ length: SLOTS }, (_, i) => (
          <li key={i} className="flex flex-col items-center gap-2 bg-paper p-4">
            <span className="panel-sunk block h-[4.5rem] w-[4.5rem]" />
            <span className="block h-2 w-3/4 bg-ink/10" />
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-display text-base font-bold">{title}</p>
        <p className="max-w-md text-sm leading-relaxed text-ink-muted">{note}</p>
        <Link to="/mint" className="btn btn-primary mt-1 px-5 py-2.5 text-xs">
          Mint your broker
        </Link>
      </div>
    </div>
  )
}
