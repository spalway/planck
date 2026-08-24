import * as React from "react"

export const GATE_STORAGE_KEY = "planckobits.disclaimer.v1"

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
  "PLANCKOBITS is experimental software. Contracts are unaudited and may fail.",
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
    >
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto border border-ink/25 bg-paper p-6">
        <h2 className="font-display text-xl">BEFORE YOU ENTER</h2>

        <ul className="mt-5 flex flex-col gap-3 text-sm leading-relaxed">
          {POINTS.map((p) => (
            <li key={p} className="border-l border-ink/20 pl-3 text-ink-muted">
              {p}
            </li>
          ))}
        </ul>

        <label className="mt-6 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 accent-cobalt"
          />
          <span>
            I have read the above and accept that I may lose everything I risk.
          </span>
        </label>

        <button
          type="button"
          disabled={!checked}
          onClick={accept}
          className="mt-6 w-full bg-cobalt py-3 text-sm tracking-widest text-white uppercase disabled:cursor-not-allowed disabled:bg-ink/20"
        >
          I understand &amp; agree
        </button>
      </div>
    </div>
  )
}
