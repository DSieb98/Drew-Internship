/**
 * M1-T05 — visible (not necessarily loud) sync-state indicator.
 *
 * Transitions are already announced to the live region by the store itself
 * (offline/online events, retry-exhausted writes — see lacrmStore.ts), so
 * this component is deliberately NOT a second aria-live region — that would
 * double-announce every change. It exists so Tim can glance (or arrow to
 * with JAWS's virtual cursor) and confirm the current state at any time,
 * which the transient live-region announcement alone can't answer once it's
 * faded. Icon glyphs are `aria-hidden` and always paired with visible text —
 * color is never the only conveyor of meaning (PRINCIPLE-03).
 */
import { useStore } from '../store/StoreContext'
import type { SyncStatus } from '../store/types'

const COPY: Record<SyncStatus, { label: string; glyph: string }> = {
  idle: { label: 'All changes saved to LACRM', glyph: '✓' },
  syncing: { label: 'Saving to LACRM…', glyph: '⟳' },
  offline: { label: "Offline — changes aren't being saved", glyph: '⚠' },
  error: { label: "Couldn't save the last change to LACRM", glyph: '⚠' },
}

export default function SyncStatusIndicator() {
  const { syncState } = useStore()
  const { label, glyph } = COPY[syncState.status]

  return (
    <p className={`sync-status sync-status--${syncState.status}`}>
      <span className="sync-status-glyph" aria-hidden="true">{glyph}</span>
      {label}
    </p>
  )
}
