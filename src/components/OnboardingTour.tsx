import { useEffect, useState } from 'react'
import FocusTrapDialog from './FocusTrapDialog'
import { ONBOARDING_STEPS } from '../content/onboarding'

interface OnboardingTourProps {
  open: boolean
  onDone: () => void
}

export default function OnboardingTour({ open, onDone }: OnboardingTourProps) {
  const [step, setStep] = useState(0)

  // Start from the first step every time the tour is (re)opened.
  useEffect(() => {
    if (open) setStep(0)
  }, [open])

  const total = ONBOARDING_STEPS.length
  const isLast = step === total - 1
  const current = ONBOARDING_STEPS[step]

  return (
    <FocusTrapDialog
      open={open}
      onClose={onDone}
      label={`App tour, step ${step + 1} of ${total}: ${current.heading}`}
      closeLabel="Skip tour"
    >
      <p className="onboarding-progress">Step {step + 1} of {total}</p>
      <h2 className="dialog-heading">{current.heading}</h2>
      <p className="dialog-body">{current.body}</p>
      <div className="onboarding-actions">
        {step > 0 && (
          <button type="button" className="btn-secondary" onClick={() => setStep(s => s - 1)}>
            Back
          </button>
        )}
        <button
          type="button"
          className="btn-primary"
          onClick={() => (isLast ? onDone() : setStep(s => s + 1))}
        >
          {isLast ? 'Finish' : 'Next'}
        </button>
      </div>
    </FocusTrapDialog>
  )
}
