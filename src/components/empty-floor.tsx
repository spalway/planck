import { Link } from "react-router-dom"

import { BrokerSprite } from "@/components/broker-sprite"
import { ROSTER } from "@/lib/brokers"
import { DESKS } from "@/lib/instruments"

/**
 * The floor with nobody on it.
 *
 * Two states share this art: the roster loaded and is genuinely empty, and
 * the roster could not be loaded at all. Both used to replace the entire page
 * with one red sentence, which made a paused database look like a broken
 * site — no wordmark, no contract address, no way to mint.
 *
 * The sentence differs between the two, and that is the whole point of the
 * `failed` prop. "Be the first to take a desk" is a claim about the floor
 * being empty. Said when the truth is that we could not read the floor, it
 * would send someone to mint believing they were first when two dozen
 * brokers already exist.
 */

/**
 * Blank slots, laid out as a wrapping row rather than a grid.
 *
 * A grid with a fixed count leaves holes: at this column width twelve slots
 * ran seven across and left two dead cells in the second row. Wrapping means
 * the row simply ends where it ends, at any width, and the slots carry their
 * own borders so there is no container ground to show through.
 */
const SLOTS = 14

/** A real broker from the fixture, so the sample is the actual art. */
const SAMPLE = ROSTER[0]

function deskLabel(id: (typeof ROSTER)[number]["desk"]) {
  return DESKS.find((d) => d.id === id)?.label ?? id.toUpperCase()
}

export function EmptyFloor({ failed = false }: { failed?: boolean }) {
  return (
    <div className="flex flex-col gap-8">
      <ul aria-hidden="true" className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: SLOTS }, (_, i) => (
          <li
            key={i}
            className="panel-flat flex w-[6.5rem] flex-col items-center gap-2 p-3"
          >
            <span className="panel-sunk block h-[3.5rem] w-[3.5rem]" />
            <span className="block h-1.5 w-3/4 bg-ink/10" />
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-display text-base font-bold">
          {failed ? "The floor is not loading" : "The roster is empty"}
        </p>
        <p className="max-w-md text-sm leading-relaxed text-ink-muted">
          {failed
            ? "We cannot read the roster right now, so we are not going to guess at it. Try again shortly."
            : "No brokers have been minted yet. Be the first to take a desk."}
        </p>
      </div>

      {/* What a filled slot turns into. Nobody arriving at an empty floor
          knows what they would be minting otherwise. */}
      {SAMPLE && (
        <figure className="panel mx-auto flex w-full max-w-[15rem] flex-col items-center gap-3 p-3">
          <figcaption className="tag self-start text-[0.55rem]">Sample</figcaption>
          <div className="panel-sunk w-full px-6 py-5">
            <div className="flex justify-center">
              <BrokerSprite broker={SAMPLE} size={120} />
            </div>
          </div>
          <div className="w-full border-t-2 border-ink/20 pt-2 text-center">
            <p className="font-display text-sm font-bold">{SAMPLE.name}</p>
            <p className="num mt-1 text-[0.65rem] text-ink-muted">
              <span className="text-cobalt">{deskLabel(SAMPLE.desk)}</span> desk
            </p>
          </div>
        </figure>
      )}

      <Link to="/mint" className="btn btn-primary mx-auto px-5 py-2.5 text-xs">
        Mint your broker
      </Link>
    </div>
  )
}
