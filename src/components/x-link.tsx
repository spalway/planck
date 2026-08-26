/**
 * The X account, next to the wallet control.
 *
 * Black rather than inverted like Connect: it is a link off-site, not an
 * action on the site, and the fill is what separates the two at a glance.
 *
 * The handle is a constant rather than an env var because it does not change
 * per deploy, and a wrong link here is worse than no link — an account that
 * does not exist reads as abandoned.
 */

/** The account, without the @. Change here and both the label and href follow. */
export const X_HANDLE = "planckbits"

export const X_URL = `https://x.com/${X_HANDLE}`

/**
 * The X mark, as a path rather than an image.
 *
 * A remote logo would be a request that can fail and a third party that can
 * see every visitor. Inline it renders with the button and inherits its
 * colour.
 */
function XMark({ size = 12 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export function XLink() {
  return (
    <a
      href={X_URL}
      target="_blank"
      // noopener is the one that matters: without it the opened tab gets a
      // handle on this window and can navigate it somewhere else.
      rel="noopener noreferrer"
      className="btn inline-flex shrink-0 items-center gap-1.5 border-ink bg-ink px-2.5 py-1.5 text-[0.7rem] text-ground hover:bg-ink hover:text-tan"
    >
      <XMark />
      <span>@{X_HANDLE}</span>
    </a>
  )
}
