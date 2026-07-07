import { ReactNode } from 'react'
import FocusTrap from 'focus-trap-react'

interface FocusTrapDialogProps {
  open: boolean
  onClose: () => void
  /** Accessible name announced by screen readers when the dialog opens. */
  label: string
  children: ReactNode
  /** Label for the close/dismiss button. Defaults to "Dismiss". */
  closeLabel?: string
}

export default function FocusTrapDialog({ open, onClose, label, children, closeLabel = 'Dismiss' }: FocusTrapDialogProps) {
  if (!open) return null

  return (
    <FocusTrap
      focusTrapOptions={{
        onDeactivate: onClose,
        clickOutsideDeactivates: true,
        escapeDeactivates: true,
        returnFocusOnDeactivate: true,
      }}
    >
      <div
        role="dialog"
        aria-label={label}
        aria-modal="true"
        className="dialog-overlay"
      >
        <div className="dialog-content">
          {children}
          <button type="button" className="dialog-close" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
      </div>
    </FocusTrap>
  )
}
