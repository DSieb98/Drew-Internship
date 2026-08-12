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
