import { useMemo } from 'react'
import type { Lead, Settings } from '../store/types'
import { getTZInfo } from '../utils/tz'

interface LeadCardProps {
  lead: Lead
  settings: Settings
  now?: Date
  onOpen?: () => void
  onTogglePin?: () => void
}

function dealValueLabel(value: number, settings: Settings): 'High' | 'Medium' | 'Low' {
  if (value >= settings.dealHighThreshold) return 'High'
  if (value >= settings.dealMediumThreshold) return 'Medium'
  return 'Low'
}

function isGoneQuiet(lead: Lead, silenceDays: number, now: Date): boolean {
  const refStr = lead.lastContactDate ?? lead.importedAt.split('T')[0]
  const ref = new Date(refStr + 'T00:00:00')
  const daysDiff = (now.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24)
  return daysDiff >= silenceDays
}

export default function LeadCard({ lead, settings, now = new Date(), onOpen, onTogglePin }: LeadCardProps) {
  const tzInfo = useMemo(
    () => (lead.timezone ? getTZInfo(lead.timezone, now) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lead.timezone, now.getTime()]
  )

  const dvLabel = dealValueLabel(lead.dealValue, settings)
  const quiet = isGoneQuiet(lead, settings.nurtureSilenceDays, now)
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const statusLower = lead.status.toLowerCase() as 'hot' | 'warm' | 'cold'

  // Accessible description for the card article
  const ariaLabel = [
    lead.company,
    lead.contactName ? `Contact: ${lead.contactName}` : null,
    `Status: ${lead.status}`,
    lead.stage ? `Stage: ${lead.stage}` : null,
    location ? `Location: ${location}` : null,
    lead.dealValue > 0 ? `Deal value: ${dvLabel}, $${lead.dealValue.toLocaleString()}` : null,
    quiet ? 'Gone quiet' : null,
    lead.pinned ? 'Pinned to My List' : null,
    tzInfo ? `Local time: ${tzInfo.localTime} ${tzInfo.abbreviation}` : null,
    tzInfo?.badHour ? 'Outside good calling hours' : null,
  ].filter(Boolean).join('. ')

  return (
    <article className="lead-card" aria-label={ariaLabel}>
      <div className="lead-card-header">
        <span className={`lead-card-status lead-card-status--${statusLower}`} aria-hidden="true">
          {lead.status}
        </span>
        <span className="lead-card-company">{lead.company}</span>
        {quiet && (
          <span className="lead-card-gone-quiet" aria-hidden="true">Gone quiet</span>
        )}
      </div>

      {lead.contactName && (
        <p className="lead-card-contact" aria-hidden="true">{lead.contactName}</p>
      )}

      <div className="lead-card-meta" aria-hidden="true">
        {lead.stage && <span className="lead-card-meta-item">{lead.stage}</span>}
        {location && <span className="lead-card-meta-item">{location}</span>}
        {lead.dealValue > 0 && (
          <span className="lead-card-meta-item">
            <span className={`lead-card-dv lead-card-dv--${dvLabel.toLowerCase()}`}>
              {dvLabel}
            </span>
            {' $'}{lead.dealValue.toLocaleString()}
          </span>
        )}
      </div>

      {tzInfo && (
        <div
          className={`lead-card-tz${tzInfo.badHour ? ' lead-card-tz--bad-hour' : ''}`}
          aria-hidden="true"
        >
          {tzInfo.localTime} {tzInfo.abbreviation}
          {tzInfo.badHour && <span className="lead-card-tz-warning"> · Outside calling hours</span>}
        </div>
      )}

      {(onOpen || onTogglePin) && (
        <div className="lead-card-actions">
          {onTogglePin && (
            <button
              type="button"
              className={`lead-card-pin-btn${lead.pinned ? ' lead-card-pin-btn--pinned' : ''}`}
              aria-pressed={lead.pinned}
              aria-label={lead.pinned ? `Unpin ${lead.company} from My List` : `Pin ${lead.company} to My List`}
              onClick={onTogglePin}
            >
              <span aria-hidden="true">{lead.pinned ? '★' : '☆'}</span> {lead.pinned ? 'Pinned' : 'Pin'}
            </button>
          )}
          {onOpen && (
            <button
              type="button"
              className="lead-card-open-btn"
              aria-label={`View details for ${lead.company}`}
              onClick={onOpen}
            >
              View details
            </button>
          )}
        </div>
      )}
    </article>
  )
}
