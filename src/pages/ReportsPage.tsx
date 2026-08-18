import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import ExplainTerm from '../components/ExplainTerm'
import { countAtOrPastStage, countQualifiedLeads } from '../utils/reportingMetrics'
import { getAiUsageStatus, type AiUsageStatus } from '../utils/claudeApi'

// D-39 — AI cost budget thresholds. "Warning" starts at 80% so Tim has real notice
// before the assistant actually stops working at 100% (enforced Worker-side, D-39).
const AI_BUDGET_WARNING_PERCENT = 80

type AiBudgetLevel = 'ok' | 'warning' | 'reached'

function aiBudgetLevel(percentUsed: number): AiBudgetLevel {
  if (percentUsed >= 100) return 'reached'
  if (percentUsed >= AI_BUDGET_WARNING_PERCENT) return 'warning'
  return 'ok'
}

const AI_BUDGET_COPY: Record<AiBudgetLevel, { glyph: string; label: string }> = {
  ok: { glyph: '✓', label: 'Within budget' },
  warning: { glyph: '⚠', label: 'Nearing this month’s budget' },
  reached: { glyph: '⚠', label: 'Budget reached — AI assistant is paused until next month' },
}

// M5-T02 — first pass at REQ-11 reporting. Covers exactly what M5-T01 confirmed has a real,
// LACRM-backed source today (leads qualified, sample boxes sent); everything else the spec's
// original candidate list named (cost per lead, alerts triggered, emails sent, response rate)
// has no data source yet and shows as an honest placeholder instead of a fabricated number — see
// D-37 and M5-T00a/T01. This is deliberately a starting point, not the final metric set: M5-T00
// (a direct conversation with Tim about what he wishes he could see) is still open and may add,
// remove, or redefine what's shown here.
export default function ReportsPage() {
  const { leads, settings, loading, error } = useStore()

  const qualifiedCount = useMemo(
    () => countQualifiedLeads(leads, settings.scoreQualificationThreshold),
    [leads, settings.scoreQualificationThreshold]
  )
  const samplesSentCount = useMemo(
    () => countAtOrPastStage(leads, 'Sample Box Sent'),
    [leads]
  )

  // D-39 — AI cost budget. Loaded independently of the lead-backed store (same pattern
  // as AskAiDialog's direct askClaude() calls) since it comes from the Worker, not LACRM.
  const [aiUsage, setAiUsage] = useState<AiUsageStatus | null>(null)
  const [aiUsageError, setAiUsageError] = useState('')
  const [aiUsageLoading, setAiUsageLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setAiUsageLoading(true)
    getAiUsageStatus()
      .then(status => { if (!cancelled) { setAiUsage(status); setAiUsageError('') } })
      .catch(err => { if (!cancelled) setAiUsageError(err instanceof Error ? err.message : 'Unknown error') })
      .finally(() => { if (!cancelled) setAiUsageLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (leads.length === 0) {
    return (
      <section aria-labelledby="reports-heading">
        <h2 id="reports-heading" className="page-heading">Reports</h2>
        {loading.leads ? (
          <p className="placeholder-content" role="status">Loading leads from LACRM…</p>
        ) : error.leads ? (
          <p className="dialog-error" role="alert">Couldn't load leads from LACRM: {error.leads}</p>
        ) : (
          <div className="placeholder-content">
            <p>No leads yet. Import leads from the All Leads page to see reporting here.</p>
          </div>
        )}
      </section>
    )
  }

  return (
    <section aria-labelledby="reports-heading">
      <h2 id="reports-heading" className="page-heading">Reports</h2>

      <p className="reports-intro">
        This is a first look at reporting, built from what's already trackable today. More will
        be added here once we've talked through what you most want visibility into.
      </p>

      <section aria-labelledby="reports-snapshot-heading" className="today-section">
        <h3 id="reports-snapshot-heading" className="today-section-heading">Pipeline Snapshot</h3>

        <dl className="reports-stats" role="status" aria-label="Pipeline snapshot statistics">
          <div className="reports-stat">
            <dt className="reports-stat-label">
              Total leads
            </dt>
            <dd className="reports-stat-value">{leads.length}</dd>
          </div>
          <div className="reports-stat">
            <dt className="reports-stat-label">
              Leads qualified
              <ExplainTerm id="pipeline-qualification" />
            </dt>
            <dd className="reports-stat-value">{qualifiedCount}</dd>
          </div>
          <div className="reports-stat">
            <dt className="reports-stat-label">Sample boxes sent</dt>
            <dd className="reports-stat-value">{samplesSentCount}</dd>
          </div>
        </dl>

        <p className="reports-stat-caveat">
          These are current counts, not a count of what happened in a specific month — LACRM
          doesn't keep a history of stage changes, only where each lead stands right now. "Sample
          boxes sent" includes leads that have since moved further along, since a box was sent to
          reach that stage.
        </p>
      </section>

      <section aria-labelledby="reports-budget-heading" className="today-section">
        <h3 id="reports-budget-heading" className="today-section-heading">
          Monthly Spending
          <ExplainTerm id="monthly-spending" />
        </h3>

        <p className="reports-budget-intro">
          Costs that change with how much SalesWhiz is used — not flat subscriptions like
          LACRM's own fee. Today that's just the AI assistant; Clay enrichment credits (not live
          yet — see "Cost per lead" below) would add here as a second line once that ships.
        </p>

        {aiUsageLoading ? (
          <p className="placeholder-content" role="status">Loading AI usage…</p>
        ) : aiUsageError ? (
          <p className="dialog-error" role="alert">Couldn't load AI usage: {aiUsageError}</p>
        ) : aiUsage ? (
          <>
            {(() => {
              const level = aiBudgetLevel(aiUsage.percentUsed)
              const { glyph, label } = AI_BUDGET_COPY[level]
              return (
                <p className={`ai-budget-status ai-budget-status--${level}`} role="status">
                  <span className="ai-budget-status-glyph" aria-hidden="true">{glyph}</span>
                  {label}
                </p>
              )
            })()}

            <dl className="reports-stats" aria-label="Monthly spending statistics">
              <div className="reports-stat">
                <dt className="reports-stat-label">Total spent this month</dt>
                <dd className="reports-stat-value">${aiUsage.costUsd.toFixed(2)}</dd>
              </div>
              <div className="reports-stat">
                <dt className="reports-stat-label">Monthly budget</dt>
                <dd className="reports-stat-value">${aiUsage.budgetUsd.toFixed(2)}</dd>
              </div>
              <div className="reports-stat">
                <dt className="reports-stat-label">Remaining</dt>
                <dd className="reports-stat-value">${aiUsage.remainingUsd.toFixed(2)}</dd>
              </div>
            </dl>

            <p className="reports-stat-caveat">
              Made up entirely of the AI assistant (Ask AI answers, "find a lead," nurture touch
              drafts) right now. Once the ${aiUsage.budgetUsd.toFixed(0)} monthly cap is reached,
              the AI assistant pauses itself until the next month; everything else in the app
              keeps working as normal. Resets on the 1st.
            </p>
          </>
        ) : null}
      </section>

      <section aria-labelledby="reports-unavailable-heading" className="today-section">
        <h3 id="reports-unavailable-heading" className="today-section-heading">Not Yet Available</h3>

        <ul className="reports-unavailable-list" aria-label="Metrics not yet available">
          <li className="reports-unavailable-item">
            <span className="interim-badge">Not yet available</span>
            <p className="reports-unavailable-text">
              <strong>Cost per lead</strong> — needs enrichment spend tracking (Clay.com/Make.com),
              which isn't live yet.
            </p>
          </li>
          <li className="reports-unavailable-item">
            <span className="interim-badge">Not yet available</span>
            <p className="reports-unavailable-text">
              <strong>Alerts triggered</strong> — the Hot Lead Alert on Today shows what's true
              right now, but nothing yet keeps a history of past alerts to count.
            </p>
          </li>
          <li className="reports-unavailable-item">
            <span className="interim-badge">Not yet available</span>
            <p className="reports-unavailable-text">
              <strong>Emails sent</strong> — pending outreach automation, which is on hold for now.
            </p>
          </li>
          <li className="reports-unavailable-item">
            <span className="interim-badge">Not yet available</span>
            <p className="reports-unavailable-text">
              <strong>Response rate</strong> — same reason as emails sent.
            </p>
          </li>
        </ul>
      </section>
    </section>
  )
}
