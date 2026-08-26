import { BrokerWall } from "@/components/broker-wall"
import { ContractSection } from "@/components/contract-section"
import { FloorCensus } from "@/components/floor-census"
import { Hero } from "@/components/hero"
import { WithRoster } from "@/components/with-roster"

export function HomePage() {
  return (
    <WithRoster>
      {(brokers) => (
        <>
          <Hero brokers={brokers} />
          {/* High on the page: the address is what a visitor arrives looking for. */}
          <ContractSection />
          <BrokerWall brokers={brokers} />
          <FloorCensus brokers={brokers} />
        </>
      )}
    </WithRoster>
  )
}
