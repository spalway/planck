import * as React from "react"

export const GATE_STORAGE_KEY = "planckbits.disclaimer.v1"

export function hasAcceptedGate(): boolean {
  try {
    return localStorage.getItem(GATE_STORAGE_KEY) === "1"
  } catch {
    // Private browsing can throw on access. Show the gate rather than
    // silently letting someone past it.
    return false
  }
}

const POINTS = [
  "PLANCKBITS is experimental software. Contracts are unaudited and may fail.",
  "Nothing here is financial advice. Nothing here is an offer to buy or sell a security.",
  "Hiring fees are spent and are not refundable. The vault does not sell its holdings.",
  "Tokenized equity exposure is restricted in some jurisdictions, including the United States. Complying with the law where you live is your responsibility.",
  "Holding $PLANCK or a broker grants no equity, no ownership, and no claim on revenue or profit of any company.",
]

export function DisclaimerGate({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = React.useState(false)

  function accept() {
    try {
      localStorage.setItem(GATE_STORAGE_KEY, "1")
    } catch {
      // Persisting is a convenience; entry should not depend on it.
    }
    onAccept()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Risk disclaimer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-umber/50 p-4"
    >
      <div className="panel max-h-[85vh] w-full max-w-xl overflow-y-auto p-6 shadow-[8px_8px_0_0_var(--umber)]">
        {/*
          The wordmark and rule are not decoration. Without them the gate is a
          white panel on a pale ground, which reads as a broken page rather
          than a dialog — it was mistaken for exactly that.
        */}
        <div className="mb-5 flex items-baseline justify-between gap-4 border-b-2 border-umber pb-4">
          <span className="font-brand text-lg tracking-tight">PLANCKBITS</span>
          <span className="text-[0.65rem] tracking-widest text-ink-muted uppercase">
            Solana · RWAs
          </span>
        </div>

        <h2 className="font-display text-xl">BEFORE YOU ENTER</h2>

        <ul className="mt-5 flex flex-col gap-3 text-sm leading-relaxed">
          {POINTS.map((p) => (
            <li key={p} className="border-l-4 border-umber/30 pl-3 text-ink-muted">
              {p}
            </li>
          ))}
        </ul>

        <label className="mt-6 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-cobalt"
          />
          <span>
            I have read the above and accept that I may lose everything I risk.
          </span>
        </label>

        <button
          type="button"
          disabled={!checked}
          onClick={accept}
          className="btn btn-primary mt-6 w-full py-3 text-sm disabled:cursor-not-allowed"
        >
          {checked ? "Enter the floor" : "Tick the box to continue"}
        </button>
      </div>
    </div>
  )
}
