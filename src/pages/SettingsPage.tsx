import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAnnounce } from '../hooks/useAnnounce'
import type { Settings, Tier } from '../store/types'

// Keys in Settings whose values are plain numbers (not Tier[])
type NumericKey = {
  [K in keyof Settings]: Settings[K] extends number ? K : never
}[keyof Settings]

// ── Sub-components ────────────────────────────────────────────────────────────

interface NumFieldProps {
  label: string
  id: string
  value: number
  min?: number
  max?: number
  error?: string
  onChange: (n: number) => void
}

function NumField({ label, id, value, min, max, error, onChange }: NumFieldProps) {
  const errorId = `${id}-error`
  return (
    <div className="settings-field">
      <label htmlFor={id} className="settings-field-label">{label}</label>
      <input
        id={id}
        type="number"
        className={`settings-field-input${error ? ' settings-field-input--error' : ''}`}
        value={value}
        min={min}
        max={max}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        onChange={e => {
          const n = Number(e.target.value)
          if (!isNaN(n)) onChange(n)
        }}
      />
      {error && (
        <p id={errorId} className="settings-field-error" role="alert">{error}</p>
      )}
    </div>
  )
}

interface TierRowProps {
  index: number
  tier: Tier
  isLast: boolean
  groupId: string
  error?: string
  onMinChange: (n: number) => void
  onMaxChange: (n: number) => void
  onPointsChange: (n: number) => void
}

function TierRow({ index, tier, isLast, groupId, error, onMinChange, onMaxChange, onPointsChange }: TierRowProps) {
  const n = index + 1
  const errId = `${groupId}-tier${index}-error`
  return (
    <>
      <tr>
        <td>
          <label htmlFor={`${groupId}-tier${index}-min`} className="sr-only">
            Tier {n} from
          </label>
          <input
            id={`${groupId}-tier${index}-min`}
            type="number"
            className="settings-field-input"
            value={tier.min}
            min={0}
            onChange={e => { const n = Number(e.target.value); if (!isNaN(n)) onMinChange(n) }}
          />
        </td>
        <td>
          {isLast ? (
            <span className="settings-tier-above">and above</span>
          ) : (
            <>
              <label htmlFor={`${groupId}-tier${index}-max`} className="sr-only">
                Tier {n} to
              </label>
              <input
                id={`${groupId}-tier${index}-max`}
                type="number"
                className={`settings-field-input${error ? ' settings-field-input--error' : ''}`}
                value={tier.max}
                min={0}
                aria-describedby={error ? errId : undefined}
                aria-invalid={error ? true : undefined}
                onChange={e => { const v = Number(e.target.value); if (!isNaN(v)) onMaxChange(v) }}
              />
            </>
          )}
        </td>
        <td>
          <label htmlFor={`${groupId}-tier${index}-pts`} className="sr-only">
            Tier {n} points
          </label>
          <input
            id={`${groupId}-tier${index}-pts`}
            type="number"
            className="settings-field-input"
            value={tier.points}
            min={0}
            onChange={e => { const v = Number(e.target.value); if (!isNaN(v)) onPointsChange(v) }}
          />
        </td>
        <td className="settings-tier-error-cell">
          {error && (
            <span id={errId} className="settings-field-error" role="alert">{error}</span>
          )}
        </td>
      </tr>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const store = useStore()
  const announce = useAnnounce()

  const [draft, setDraft] = useState<Settings>(() => store.settings)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  function setNum(key: NumericKey, value: number) {
    setDraft(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function setTier(
    group: 'employeeTiers' | 'revenueTiers',
    index: number,
    field: keyof Tier,
    value: number
  ) {
    setDraft(prev => ({
      ...prev,
      [group]: prev[group].map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      ) as Settings[typeof group],
    }))
    setSaved(false)
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}

    if (draft.hotScoreThreshold < 1 || draft.hotScoreThreshold > 100)
      e.hotScoreThreshold = 'Must be between 1 and 100.'
    if (draft.warmScoreThreshold < 0 || draft.warmScoreThreshold >= draft.hotScoreThreshold)
      e.warmScoreThreshold = `Must be 0 to ${draft.hotScoreThreshold - 1} (below Hot).`
    if (draft.dealHighThreshold <= draft.dealMediumThreshold)
      e.dealHighThreshold = 'High threshold must be greater than the Medium threshold.'
    if (draft.dealMediumThreshold < 0)
      e.dealMediumThreshold = 'Must be 0 or more.'
    if (draft.promoInterestPoints > draft.promoOneOrderPoints)
      e.promoInterestPoints = 'Interest points must not exceed one-order points.'
    if (draft.promoOneOrderPoints > draft.promoMultipleOrdersPoints)
      e.promoOneOrderPoints = 'One-order points must not exceed multiple-orders points.'
    if (draft.nurtureSilenceDays < 1)
      e.nurtureSilenceDays = 'Must be at least 1 day.'

    draft.employeeTiers.forEach((t, i) => {
      if (i < 3 && t.min > t.max)
        e[`empTier${i}`] = 'Min must not exceed max.'
    })
    draft.revenueTiers.forEach((t, i) => {
      if (i < 3 && t.min > t.max)
        e[`revTier${i}`] = 'Min must not exceed max.'
    })

    return e
  }

  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const focusable = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('input, button, select, textarea')
    ).filter(el => !(el as HTMLInputElement).disabled)
    const idx = focusable.indexOf(document.activeElement as HTMLElement)
    if (idx === -1) return
    e.preventDefault()
    if (e.key === 'ArrowDown' && idx < focusable.length - 1) focusable[idx + 1].focus()
    if (e.key === 'ArrowUp'   && idx > 0)                   focusable[idx - 1].focus()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      const n = Object.keys(errs).length
      announce(`${n} validation ${n === 1 ? 'error' : 'errors'} — please fix before saving.`)
      return
    }
    await store.updateSettings(draft)
    setSaved(true)
    announce('Settings saved. Lead scores and statuses have been updated.')
  }

  return (
    <section aria-labelledby="settings-heading">
      <h2 id="settings-heading" className="page-heading">Settings</h2>

      <form className="settings-form" onSubmit={handleSave} onKeyDown={handleFormKeyDown} noValidate>

        {/* ── Status thresholds ─────────────────────────────────── */}
        <fieldset className="settings-group">
          <legend className="settings-group-legend">Status Thresholds</legend>
          <p className="settings-group-help">
            These score cutoffs determine whether a lead is Hot, Warm, or Cold.
            Tim can always override a lead's status manually.
          </p>
          <NumField
            label="Hot — score at or above this → Hot"
            id="hot-threshold"
            value={draft.hotScoreThreshold}
            min={1} max={100}
            error={errors.hotScoreThreshold}
            onChange={n => setNum('hotScoreThreshold', n)}
          />
          <NumField
            label="Warm — score at or above this → Warm; below this → Cold"
            id="warm-threshold"
            value={draft.warmScoreThreshold}
            min={0} max={99}
            error={errors.warmScoreThreshold}
            onChange={n => setNum('warmScoreThreshold', n)}
          />
        </fieldset>

        {/* ── Qualification cutoff ──────────────────────────────── */}
        <fieldset className="settings-group">
          <legend className="settings-group-legend">Pipeline Qualification Cutoff</legend>
          <p className="settings-group-help">
            Leads scoring at or above this enter the main pipeline.
            Currently set to 0 (all leads qualify) until Greg and Tim confirm the number.
          </p>
          <NumField
            label="Score qualification cutoff (0 = all leads qualify)"
            id="qual-threshold"
            value={draft.scoreQualificationThreshold}
            min={0} max={100}
            error={errors.scoreQualificationThreshold}
            onChange={n => setNum('scoreQualificationThreshold', n)}
          />
        </fieldset>

        {/* ── Hot lead alert ────────────────────────────────────── */}
        <fieldset className="settings-group">
          <legend className="settings-group-legend">Hot Lead Alert</legend>
          <p className="settings-group-help">
            Hot lead alerts only fire when the lead's deal value is at or above this amount.
          </p>
          <NumField
            label="Minimum deal value ($)"
            id="hot-alert-deal"
            value={draft.hotAlertMinDealValue}
            min={0}
            error={errors.hotAlertMinDealValue}
            onChange={n => setNum('hotAlertMinDealValue', n)}
          />
        </fieldset>

        {/* ── Deal-value labels ─────────────────────────────────── */}
        <fieldset className="settings-group">
          <legend className="settings-group-legend">Deal-Value Labels</legend>
          <p className="settings-group-help">
            Controls the High / Medium / Low label shown next to each deal value.
          </p>
          <NumField
            label={`High — deal value ≥ $${draft.dealHighThreshold.toLocaleString()} → High`}
            id="deal-high"
            value={draft.dealHighThreshold}
            min={0}
            error={errors.dealHighThreshold}
            onChange={n => setNum('dealHighThreshold', n)}
          />
          <NumField
            label={`Medium — deal value ≥ $${draft.dealMediumThreshold.toLocaleString()} → Medium; below → Low`}
            id="deal-medium"
            value={draft.dealMediumThreshold}
            min={0}
            error={errors.dealMediumThreshold}
            onChange={n => setNum('dealMediumThreshold', n)}
          />
        </fieldset>

        {/* ── Employee tiers ────────────────────────────────────── */}
        <fieldset className="settings-group">
          <legend className="settings-group-legend">Employee Count Tiers (Scoring)</legend>
          <p className="settings-group-help">
            Points awarded based on number of employees (criterion S-02, max{' '}
            {Math.max(...draft.employeeTiers.map(t => t.points))} pts).
            The top tier covers all values at or above its "From" number.
          </p>
          <table className="settings-tier-table">
            <caption className="sr-only">Employee count scoring tiers</caption>
            <thead>
              <tr>
                <th scope="col">From</th>
                <th scope="col">To</th>
                <th scope="col">Points</th>
                <th scope="col" className="sr-only">Validation</th>
              </tr>
            </thead>
            <tbody>
              {draft.employeeTiers.map((tier, i) => (
                <TierRow
                  key={i}
                  index={i}
                  tier={tier}
                  isLast={i === 3}
                  groupId="emp"
                  error={errors[`empTier${i}`]}
                  onMinChange={n => setTier('employeeTiers', i, 'min', n)}
                  onMaxChange={n => setTier('employeeTiers', i, 'max', n)}
                  onPointsChange={n => setTier('employeeTiers', i, 'points', n)}
                />
              ))}
            </tbody>
          </table>
        </fieldset>

        {/* ── Revenue tiers ─────────────────────────────────────── */}
        <fieldset className="settings-group">
          <legend className="settings-group-legend">Annual Revenue Tiers (Scoring)</legend>
          <p className="settings-group-help">
            Points awarded based on estimated annual revenue (criterion S-03, max{' '}
            {Math.max(...draft.revenueTiers.map(t => t.points))} pts).
            Values in dollars. The top tier covers all values at or above its "From" number.
          </p>
          <table className="settings-tier-table">
            <caption className="sr-only">Annual revenue scoring tiers</caption>
            <thead>
              <tr>
                <th scope="col">From ($)</th>
                <th scope="col">To ($)</th>
                <th scope="col">Points</th>
                <th scope="col" className="sr-only">Validation</th>
              </tr>
            </thead>
            <tbody>
              {draft.revenueTiers.map((tier, i) => (
                <TierRow
                  key={i}
                  index={i}
                  tier={tier}
                  isLast={i === 3}
                  groupId="rev"
                  error={errors[`revTier${i}`]}
                  onMinChange={n => setTier('revenueTiers', i, 'min', n)}
                  onMaxChange={n => setTier('revenueTiers', i, 'max', n)}
                  onPointsChange={n => setTier('revenueTiers', i, 'points', n)}
                />
              ))}
            </tbody>
          </table>
        </fieldset>

        {/* ── Promo product points ──────────────────────────────── */}
        <fieldset className="settings-group">
          <legend className="settings-group-legend">Promo Product Points (Scoring)</legend>
          <p className="settings-group-help">
            Points awarded for promo purchase history (criterion S-06).
            Three levels — interest, one order, or multiple orders.
          </p>
          <NumField
            label="Interest — has inquired but not yet ordered"
            id="promo-interest"
            value={draft.promoInterestPoints}
            min={0} max={draft.promoMultipleOrdersPoints}
            error={errors.promoInterestPoints}
            onChange={n => setNum('promoInterestPoints', n)}
          />
          <NumField
            label="One order — has placed a single promo order"
            id="promo-one"
            value={draft.promoOneOrderPoints}
            min={0} max={draft.promoMultipleOrdersPoints}
            error={errors.promoOneOrderPoints}
            onChange={n => setNum('promoOneOrderPoints', n)}
          />
          <NumField
            label="Multiple orders — repeat buyer"
            id="promo-multiple"
            value={draft.promoMultipleOrdersPoints}
            min={0}
            error={errors.promoMultipleOrdersPoints}
            onChange={n => setNum('promoMultipleOrdersPoints', n)}
          />
        </fieldset>

        {/* ── Nurture cue ───────────────────────────────────────── */}
        <fieldset className="settings-group">
          <legend className="settings-group-legend">Nurture Cue</legend>
          <p className="settings-group-help">
            How many days without contact before a lead is flagged as "gone quiet."
          </p>
          <NumField
            label="Days silent before gone-quiet cue"
            id="nurture-silence"
            value={draft.nurtureSilenceDays}
            min={1}
            error={errors.nurtureSilenceDays}
            onChange={n => setNum('nurtureSilenceDays', n)}
          />
          <NumField
            label="Recent activity window (days) — shown on Today page"
            id="recent-activity-days"
            value={draft.recentActivityDays}
            min={1}
            error={errors.recentActivityDays}
            onChange={n => setNum('recentActivityDays', n)}
          />
        </fieldset>

        {/* ── AI features ──────────────────────────────────────── */}
        <fieldset className="settings-group">
          <legend className="settings-group-legend">AI Features</legend>
          <p className="settings-group-help">
            Enter your Anthropic API key to unlock AI call openers, next-step tips, and email
            drafts in the lead drawer. The key is held in memory only and never leaves your browser.
          </p>
          <div className="settings-field">
            <label htmlFor="anthropic-api-key" className="settings-field-label">
              Anthropic API key
            </label>
            <input
              id="anthropic-api-key"
              type="password"
              autoComplete="off"
              className="settings-field-input settings-field-input--wide"
              value={draft.anthropicApiKey}
              placeholder="sk-ant-…"
              onChange={e => {
                setDraft(prev => ({ ...prev, anthropicApiKey: e.target.value }))
                setSaved(false)
              }}
            />
          </div>
        </fieldset>

        {/* ── Save ──────────────────────────────────────────────── */}
        <div className="settings-actions">
          {saved && (
            <p className="settings-saved">Settings saved.</p>
          )}
          <button type="submit" className="btn-primary">
            Save settings
          </button>
        </div>

      </form>
    </section>
  )
}
