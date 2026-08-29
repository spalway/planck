import * as React from "react"

/**
 * Catches a render crash so one broken component does not blank the site.
 *
 * React unmounts the whole tree when a render throws, so without this the
 * page becomes white — no header, no nav, no way out. This keeps the chrome
 * and offers a reload.
 *
 * Must be a class: there is still no hook equivalent of componentDidCatch.
 */

type Props = { children: React.ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[APEBITS] render error:", error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <section className="rule py-14">
        <header className="mb-6 flex items-baseline gap-4">
          <span className="num text-xs text-loss">!!</span>
          <h2 className="font-display text-2xl tracking-tight">SOMETHING BROKE</h2>
        </header>

        <p className="max-w-xl text-sm leading-relaxed text-ink-muted">
          This page failed to render. The rest of the site still works — the nav above
          will take you elsewhere.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn mt-6 px-4 py-2 text-xs"
        >
          Reload
        </button>
      </section>
    )
  }
}
