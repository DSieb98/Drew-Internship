// TZ-01: derive local time and calling-hour safety from an IANA timezone string.
// Uses only browser-native Intl — no external API or lookup table.

export interface TZInfo {
  abbreviation: string   // e.g. "EST", "CDT"
  localTime: string      // e.g. "2:34 PM"
  localHour: number      // 0-23
  badHour: boolean       // true when outside 8 AM – 6 PM local
}

export function getTZInfo(timezone: string, now: Date = new Date()): TZInfo | null {
  try {
    const abbrParts = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'short',
      timeZone: timezone,
    }).formatToParts(now)
    const abbreviation = abbrParts.find(p => p.type === 'timeZoneName')?.value ?? timezone

    const localTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    }).format(now)

    // hour12: false yields 0-23 (midnight may return "24", hence % 24)
    const hourStr = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    }).format(now)
    const localHour = Number(hourStr) % 24

    return { abbreviation, localTime, localHour, badHour: localHour < 8 || localHour >= 18 }
  } catch {
    return null
  }
}
