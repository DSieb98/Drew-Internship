import { ReactNode } from 'react'
import FocusTrap from 'focus-trap-react'

interface FocusTrapDialogProps {
  open: boolean
  onClose: () => void
  /** Accessible name announced by screen readers when the dialog opens. */
  label: string
  children: ReactNode
}

export default function FocusTrapDialog({ open, onClose, label, children }: FocusTrapDialogProps) {
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
            Dismiss
          </button>
        </div>
      </div>
    </FocusTrap>
  )
}
