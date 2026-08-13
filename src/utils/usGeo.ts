// US state name/abbreviation normalization — originally built for the Map view's geocoding
// (T06), which was removed in favor of city/state/timezone filtering (see CallTimesPage.tsx,
// D-34). The coordinate lookups that page needed are gone; normalizeStateAbbr()/stateFullName()
// stay because lead search (leadSearch.ts, D-31) still depends on them to match state names.

// Valid 2-letter US state (+ DC) abbreviations — used only to validate/normalize input, not for
// any geocoding anymore.
const VALID_STATE_ABBRS = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WI', 'WV', 'WY', 'DC',
])

const STATE_NAMES: Record<string, string> = {
  ALABAMA: 'AL', ALASKA: 'AK', ARIZONA: 'AZ', ARKANSAS: 'AR', CALIFORNIA: 'CA',
  COLORADO: 'CO', CONNECTICUT: 'CT', DELAWARE: 'DE', FLORIDA: 'FL', GEORGIA: 'GA',
  HAWAII: 'HI', IDAHO: 'ID', ILLINOIS: 'IL', INDIANA: 'IN', IOWA: 'IA',
  KANSAS: 'KS', KENTUCKY: 'KY', LOUISIANA: 'LA', MAINE: 'ME', MARYLAND: 'MD',
  MASSACHUSETTS: 'MA', MICHIGAN: 'MI', MINNESOTA: 'MN', MISSISSIPPI: 'MS',
  MISSOURI: 'MO', MONTANA: 'MT', NEBRASKA: 'NE', NEVADA: 'NV',
  'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
  'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', OHIO: 'OH', OKLAHOMA: 'OK',
  OREGON: 'OR', PENNSYLVANIA: 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
  'SOUTH DAKOTA': 'SD', TENNESSEE: 'TN', TEXAS: 'TX', UTAH: 'UT', VERMONT: 'VT',
  VIRGINIA: 'VA', WASHINGTON: 'WA', 'WEST VIRGINIA': 'WV', WISCONSIN: 'WI',
  WYOMING: 'WY', 'DISTRICT OF COLUMBIA': 'DC', 'WASHINGTON DC': 'DC', 'WASHINGTON D.C.': 'DC',
}

export function normalizeStateAbbr(state: string): string | null {
  const trimmed = state.trim()
  if (!trimmed) return null
  const upper = trimmed.toUpperCase()
  if (upper.length === 2 && VALID_STATE_ABBRS.has(upper)) return upper
  const withoutDots = upper.replace(/\./g, '')
  return STATE_NAMES[withoutDots] ?? (VALID_STATE_ABBRS.has(withoutDots) ? withoutDots : null)
}

// Reverse of STATE_NAMES (abbreviation → lowercase full name), first-listed name wins for
// abbreviations with multiple aliases (e.g. DC). Used by lead search (leadSearch.ts) so typing
// a full state name ("Texas") matches leads whose stored state is the abbreviation ("TX").
const STATE_ABBR_TO_NAME: Record<string, string> = {}
for (const [name, abbr] of Object.entries(STATE_NAMES)) {
  if (!STATE_ABBR_TO_NAME[abbr]) STATE_ABBR_TO_NAME[abbr] = name.toLowerCase()
}

export function stateFullName(state: string): string | null {
  const abbr = normalizeStateAbbr(state)
  return abbr ? STATE_ABBR_TO_NAME[abbr] ?? null : null
}

// One representative IANA zone per state — state-level approximation, not city-level (the
// coordinate data that would allow city-level precision was removed with the map, D-34). Several
// states genuinely span two zones (TX/FL/MI/IN/KY/TN/KS/NE/ND/SD/ID/OR); each is mapped to its
// most-populous zone. AZ gets its own entry (America/Phoenix) since it doesn't observe DST,
// unlike the rest of the Mountain zone (America/Denver).
const STATE_TIMEZONES: Record<string, string> = {
  CT: 'America/New_York', DE: 'America/New_York', DC: 'America/New_York',
  FL: 'America/New_York', GA: 'America/New_York', ME: 'America/New_York',
  MD: 'America/New_York', MA: 'America/New_York', MI: 'America/New_York',
  NH: 'America/New_York', NJ: 'America/New_York', NY: 'America/New_York',
  NC: 'America/New_York', OH: 'America/New_York', PA: 'America/New_York',
  RI: 'America/New_York', SC: 'America/New_York', VT: 'America/New_York',
  VA: 'America/New_York', WV: 'America/New_York', IN: 'America/New_York',
  KY: 'America/New_York',

  AL: 'America/Chicago', AR: 'America/Chicago', IL: 'America/Chicago',
  IA: 'America/Chicago', KS: 'America/Chicago', LA: 'America/Chicago',
  MN: 'America/Chicago', MS: 'America/Chicago', MO: 'America/Chicago',
  NE: 'America/Chicago', ND: 'America/Chicago', OK: 'America/Chicago',
  SD: 'America/Chicago', TX: 'America/Chicago', WI: 'America/Chicago',
  TN: 'America/Chicago',

  CO: 'America/Denver', ID: 'America/Denver', MT: 'America/Denver',
  NM: 'America/Denver', UT: 'America/Denver', WY: 'America/Denver',
  AZ: 'America/Phoenix',

  CA: 'America/Los_Angeles', NV: 'America/Los_Angeles',
  OR: 'America/Los_Angeles', WA: 'America/Los_Angeles',

  AK: 'America/Anchorage',
  HI: 'Pacific/Honolulu',
}

// Derives a lead's IANA timezone from its state — there's no LACRM field or spreadsheet column
// for timezone (it was never meant to be imported directly, only derived), so this is the only
// source. Returns '' (not null) so callers can assign it straight into Lead.timezone without an
// extra null-check; falsy behaves the same as "unknown" everywhere timezone is consumed
// (LeadCard's local-time display, CallTimesPage's filter/toggle).
export function stateToTimezone(state: string): string {
  const abbr = normalizeStateAbbr(state)
  return abbr ? STATE_TIMEZONES[abbr] ?? '' : ''
}
