import { Roster } from "@/components/roster"
import { WithRoster } from "@/components/with-roster"

export function BrokersPage() {
  return <WithRoster>{(brokers, failed) => <Roster brokers={brokers} failed={failed} />}</WithRoster>
}
