import { Hero } from "@/components/hero"
import { FloorCensus } from "@/components/floor-census"
import { ROSTER } from "@/lib/brokers"

export function HomePage() {
  return (
    <>
      <Hero />
      <FloorCensus brokers={ROSTER} />
    </>
  )
}
