import { Roster } from "@/components/roster"
import { ROSTER } from "@/lib/brokers"

export function BrokersPage() {
  return <Roster brokers={ROSTER} />
}
