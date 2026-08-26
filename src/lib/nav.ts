/**
 * The site's routes.
 *
 * Labels are deliberately plain. The in-world vocabulary — desks, the floor,
 * the record — is good copy inside a page but poor signage: a visitor
 * reading "RECORD" in a nav bar cannot tell whether it is a track record, a
 * ledger, or a history page. The nav says what you will find; the page
 * headings keep the firm's own language.
 */
export const ROUTES = [
  { path: "/", label: "Home" },
  { path: "/assets", label: "Assets" },
  { path: "/brokers", label: "Brokers" },
  { path: "/mint", label: "Mint" },
  { path: "/holdings", label: "Holdings" },
  { path: "/how-it-works", label: "How It Works" },
] as const
