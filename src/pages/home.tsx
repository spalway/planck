import { BrokerWall } from "@/components/broker-wall"
import { FloorCensus } from "@/components/floor-census"
import { Hero } from "@/components/hero"
import { WithRoster } from "@/components/with-roster"

export function HomePage() {
  return (
    <WithRoster>
      {(brokers, failed) => (
        <>
          {/* The contract section lives inside the hero now, above the buttons. */}
          <Hero brokers={brokers} />
          <BrokerWall brokers={brokers} failed={failed} />
          <FloorCensus brokers={brokers} />
        </>
      )}
    </WithRoster>
  )
}
