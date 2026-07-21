// T06: static US city/state coordinate lookup for the Map view.
// No live geodata service — all coordinates are bundled at build time (per spec: "Out of
// scope: Routing/directions or any live geodata service").
//
// Leads are geocoded at city precision when the city is recognized, falling back to the
// state's capital (a reasonable stand-in for a state centroid) when it isn't.

export type GeoPrecision = 'city' | 'state'

export interface GeoResult {
  lon: number
  lat: number
  precision: GeoPrecision
}

// [lon, lat] per US state + DC, using the state capital as a stand-in centroid.
const STATE_CAPITALS: Record<string, [number, number]> = {
  AL: [-86.3077, 32.3792], AK: [-134.4197, 58.3019], AZ: [-112.0740, 33.4484],
  AR: [-92.2896, 34.7465], CA: [-121.4944, 38.5816], CO: [-104.9903, 39.7392],
  CT: [-72.6734, 41.7658], DE: [-75.5244, 39.1582], FL: [-84.2807, 30.4383],
  GA: [-84.3880, 33.7490], HI: [-157.8583, 21.3069], ID: [-116.2023, 43.6150],
  IL: [-89.6501, 39.7817], IN: [-86.1581, 39.7684], IA: [-93.6250, 41.5868],
  KS: [-95.6752, 39.0473], KY: [-84.8733, 38.2009], LA: [-91.1871, 30.4515],
  ME: [-69.7795, 44.3106], MD: [-76.4922, 38.9784], MA: [-71.0589, 42.3601],
  MI: [-84.5555, 42.7325], MN: [-93.0900, 44.9537], MS: [-90.1848, 32.2988],
  MO: [-92.1735, 38.5767], MT: [-112.0391, 46.5891], NE: [-96.7026, 40.8136],
  NV: [-119.7674, 39.1638], NH: [-71.5376, 43.2081], NJ: [-74.7597, 40.2206],
  NM: [-105.9378, 35.6870], NY: [-73.7562, 42.6526], NC: [-78.6382, 35.7796],
  ND: [-100.7837, 46.8083], OH: [-82.9988, 39.9612], OK: [-97.5164, 35.4676],
  OR: [-123.0351, 44.9429], PA: [-76.8867, 40.2732], RI: [-71.4128, 41.8240],
  SC: [-81.0348, 34.0007], SD: [-100.3510, 44.3683], TN: [-86.7816, 36.1627],
  TX: [-97.7431, 30.2672], UT: [-111.8910, 40.7608], VT: [-72.5754, 44.2601],
  VA: [-77.4360, 37.5407], WA: [-122.9007, 47.0379], WI: [-89.4012, 43.0731],
  WV: [-81.6326, 38.3498], WY: [-104.8202, 41.1400], DC: [-77.0369, 38.9072],
}

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

// [lon, lat] for major US cities, keyed by "city|state abbreviation" (both lowercased).
// Covers the most populous city in most states plus other common metros; anything else
// falls back to the state capital.
const CITY_COORDS: Record<string, [number, number]> = {
  'new york|ny': [-74.0060, 40.7128],
  'los angeles|ca': [-118.2437, 34.0522],
  'chicago|il': [-87.6298, 41.8781],
  'houston|tx': [-95.3698, 29.7604],
  'phoenix|az': [-112.0740, 33.4484],
  'philadelphia|pa': [-75.1652, 39.9526],
  'san antonio|tx': [-98.4936, 29.4241],
  'san diego|ca': [-117.1611, 32.7157],
  'dallas|tx': [-96.7970, 32.7767],
  'san jose|ca': [-121.8863, 37.3382],
  'austin|tx': [-97.7431, 30.2672],
  'jacksonville|fl': [-81.6557, 30.3322],
  'fort worth|tx': [-97.3308, 32.7555],
  'columbus|oh': [-82.9988, 39.9612],
  'charlotte|nc': [-80.8431, 35.2271],
  'san francisco|ca': [-122.4194, 37.7749],
  'indianapolis|in': [-86.1581, 39.7684],
  'seattle|wa': [-122.3321, 47.6062],
  'denver|co': [-104.9903, 39.7392],
  'washington|dc': [-77.0369, 38.9072],
  'nashville|tn': [-86.7816, 36.1627],
  'oklahoma city|ok': [-97.5164, 35.4676],
  'el paso|tx': [-106.4850, 31.7619],
  'boston|ma': [-71.0589, 42.3601],
  'las vegas|nv': [-115.1398, 36.1699],
  'portland|or': [-122.6765, 45.5152],
  'detroit|mi': [-83.0458, 42.3314],
  'memphis|tn': [-90.0490, 35.1495],
  'louisville|ky': [-85.7585, 38.2527],
  'baltimore|md': [-76.6122, 39.2904],
  'milwaukee|wi': [-87.9065, 43.0389],
  'albuquerque|nm': [-106.6504, 35.0844],
  'tucson|az': [-110.9747, 32.2226],
  'fresno|ca': [-119.7871, 36.7378],
  'mesa|az': [-111.8315, 33.4152],
  'kansas city|mo': [-94.5786, 39.0997],
  'atlanta|ga': [-84.3880, 33.7490],
  'miami|fl': [-80.1918, 25.7617],
  'raleigh|nc': [-78.6382, 35.7796],
  'omaha|ne': [-95.9345, 41.2565],
  'colorado springs|co': [-104.8214, 38.8339],
  'long beach|ca': [-118.1937, 33.7701],
  'virginia beach|va': [-75.9780, 36.8529],
  'oakland|ca': [-122.2712, 37.8044],
  'minneapolis|mn': [-93.2650, 44.9778],
  'tulsa|ok': [-95.9928, 36.1540],
  'tampa|fl': [-82.4572, 27.9506],
  'new orleans|la': [-90.0715, 29.9511],
  'cleveland|oh': [-81.6944, 41.4993],
  'honolulu|hi': [-157.8583, 21.3069],
  'anchorage|ak': [-149.9003, 61.2181],
  'st. louis|mo': [-90.1994, 38.6270],
  'saint louis|mo': [-90.1994, 38.6270],
  'pittsburgh|pa': [-79.9959, 40.4406],
  'cincinnati|oh': [-84.5120, 39.1031],
  'orlando|fl': [-81.3792, 28.5384],
  'salt lake city|ut': [-111.8910, 40.7608],
}

export function normalizeStateAbbr(state: string): string | null {
  const trimmed = state.trim()
  if (!trimmed) return null
  const upper = trimmed.toUpperCase()
  if (upper.length === 2 && STATE_CAPITALS[upper]) return upper
  const withoutDots = upper.replace(/\./g, '')
  return STATE_NAMES[withoutDots] ?? (STATE_CAPITALS[withoutDots] ? withoutDots : null)
}

export function geocodeLead(city: string, state: string): GeoResult | null {
  const abbr = normalizeStateAbbr(state)
  if (!abbr) return null

  const cityKey = `${city.trim().toLowerCase()}|${abbr.toLowerCase()}`
  const cityCoord = CITY_COORDS[cityKey]
  if (cityCoord) return { lon: cityCoord[0], lat: cityCoord[1], precision: 'city' }

  const stateCoord = STATE_CAPITALS[abbr]
  if (stateCoord) return { lon: stateCoord[0], lat: stateCoord[1], precision: 'state' }

  return null
}
