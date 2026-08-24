import { FloorCensus } from "@/components/floor-census"
import { Hero } from "@/components/hero"
import { WithRoster } from "@/components/with-roster"

export function HomePage() {
  return (
    <>
      <Hero />
      <WithRoster>{(brokers) => <FloorCensus brokers={brokers} />}</WithRoster>
    </>
  )
}
