import { useEffect, useState } from 'react'

// Found 2026-08-13: every page passing `now` to LeadCard/CallTimesPage used
// `useMemo(() => new Date(), [])` - frozen at first render, never updating again for the life of
// the page. Harmless for most uses, but wrong for anything time-sensitive: LeadCard's local-time
// display (TZ-01) and CallTimesPage's "Good calling hours only" toggle both drift further from
// reality the longer a tab stays open, since the badHour boundary (8am/6pm local) can be crossed
// mid-session without ever re-evaluating.
//
// Ticks every 30s - plenty for minute-granularity clock display and hour-boundary checks, without
// re-rendering on every second for no visible benefit.
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
