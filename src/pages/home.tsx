import { BrokerWall } from "@/components/broker-wall"
import { FloorCensus } from "@/components/floor-census"
import { Hero } from "@/components/hero"
import { WithRoster } from "@/components/with-roster"

export function HomePage() {
  return (
    <WithRoster>
      {(brokers) => (
        <>
          <Hero brokers={brokers} />
          <BrokerWall brokers={brokers} />
          <FloorCensus brokers={brokers} />
        </>
      )}
    </WithRoster>
  )
}
