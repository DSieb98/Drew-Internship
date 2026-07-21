import { useMemo } from 'react'
import { geoAlbersUsa, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import usStatesTopology from 'us-atlas/states-albers-10m.json'
import type { Lead } from '../store/types'
import { geocodeLead } from '../utils/usGeo'

// states-albers-10m.json ships geometry already projected with d3's default
// geoAlbersUsa() (960x600 viewBox), so the state paths render with an identity
// path (no projection) while lead coordinates are run through the same
// projection to land in the same pixel space.
const projection = geoAlbersUsa()
const statePath = geoPath()

const topology = usStatesTopology as unknown as Topology
const stateFeatures = feature(
  topology,
  topology.objects.states as GeometryCollection
).features

interface Pin {
  id: string
  x: number
  y: number
  status: Lead['status']
}

function buildPins(leads: Lead[]): Pin[] {
  const seenAt = new Map<string, number>()
  const pins: Pin[] = []

  for (const lead of leads) {
    const geo = geocodeLead(lead.city, lead.state)
    if (!geo) continue
    const projected = projection([geo.lon, geo.lat])
    if (!projected) continue

    const bucketKey = `${Math.round(projected[0])},${Math.round(projected[1])}`
    const indexInBucket = seenAt.get(bucketKey) ?? 0
    seenAt.set(bucketKey, indexInBucket + 1)

    // Deterministic golden-angle spiral so leads sharing a coordinate (common
    // with the state-capital fallback) fan out instead of stacking exactly.
    const radius = indexInBucket === 0 ? 0 : 3 * Math.sqrt(indexInBucket)
    const angle = indexInBucket * 137.5 * (Math.PI / 180)

    pins.push({
      id: lead.id,
      x: projected[0] + radius * Math.cos(angle),
      y: projected[1] + radius * Math.sin(angle),
      status: lead.status,
    })
  }

  return pins
}

interface USAMapProps {
  leads: Lead[]
}

export default function USAMap({ leads }: USAMapProps) {
  const pins = useMemo(() => buildPins(leads), [leads])

  return (
    <svg
      className="usa-map"
      viewBox="0 0 960 600"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <g className="usa-map-states">
        {stateFeatures.map((f, i) => (
          <path key={i} d={statePath(f) ?? undefined} />
        ))}
      </g>
      <g className="usa-map-pins">
        {pins.map(p => (
          <circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r={4}
            className={`usa-map-pin usa-map-pin--${p.status.toLowerCase()}`}
          />
        ))}
      </g>
    </svg>
  )
}
