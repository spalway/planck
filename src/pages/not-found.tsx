import { Link } from "react-router-dom"

import { Section } from "@/components/primitives"

export function NotFoundPage() {
  return (
    <Section id="not-found" label="—" title="nothing at this address">
      <p className="text-sm text-ink-muted">
        That page is not part of the firm.{" "}
        <Link to="/" className="text-cobalt underline">
          Back to the floor
        </Link>
        .
      </p>
    </Section>
  )
}
