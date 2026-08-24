import { VaultRecord } from "@/components/vault-record"
import { VAULT_HOLDINGS } from "@/lib/vault"

export function HoldingsPage() {
  return <VaultRecord holdings={VAULT_HOLDINGS} />
}
