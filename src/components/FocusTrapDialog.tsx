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
  /** Extra CSS class appended to the inner dialog-content div. */
  contentClassName?: string
}

export default function FocusTrapDialog({ open, onClose, label, children, closeLabel = 'Dismiss', contentClassName }: FocusTrapDialogProps) {
  if (!open) return null

  // Close is handled by our own backdrop-click and Escape listeners below, not by
  // focus-trap-react's onDeactivate/clickOutsideDeactivates/escapeDeactivates. Those
  // tie deactivation to this component's mount lifecycle, and React 18 StrictMode
  // deliberately mounts, unmounts, and remounts every component once in dev — which
  // would call onDeactivate (and so onClose) immediately, closing the dialog on open.
  // See: https://github.com/focus-trap/focus-trap-react#%EF%B8%8F%EF%B8%8F-react-18-strict-mode-%EF%B8%8F%EF%B8%8F
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <FocusTrap
      focusTrapOptions={{
        clickOutsideDeactivates: false,
        escapeDeactivates: false,
        returnFocusOnDeactivate: true,
      }}
    >
      <div
        role="dialog"
        aria-label={label}
        aria-modal="true"
        className="dialog-overlay"
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
      >
        <div className={`dialog-content${contentClassName ? ` ${contentClassName}` : ''}`}>
          {children}
          <button type="button" className="dialog-close" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
      </div>
    </FocusTrap>
  )
}
