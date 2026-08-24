import { DeskBoard } from "@/components/desk-board"
import { WithRoster } from "@/components/with-roster"
import { VAULT_HOLDINGS } from "@/lib/vault"

export function AssetsPage() {
  return (
    <WithRoster>
      {(brokers) => <DeskBoard brokers={brokers} holdings={VAULT_HOLDINGS} />}
    </WithRoster>
  )
}
