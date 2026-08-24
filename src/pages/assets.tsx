import { DeskBoard } from "@/components/desk-board"
import { ROSTER } from "@/lib/brokers"
import { VAULT_HOLDINGS } from "@/lib/vault"

export function AssetsPage() {
  return <DeskBoard brokers={ROSTER} holdings={VAULT_HOLDINGS} />
}
