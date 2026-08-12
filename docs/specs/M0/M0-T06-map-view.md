# M0-T06 — Map view (gap G3, TZ-01)

> **Superseded 2026-08-12 (D-34).** Tim asked for the visual map to be replaced with filtering by
> city, state, and time zone plus a "good calling hours now" toggle — the map (always `aria-hidden`
> and decorative-only per this spec's own accessibility constraint below) never actually told a
> JAWS user whether it was a good time to call someone in another time zone; direct filtering does.
> `MapPage.tsx`/`USAMap.tsx` deleted; replaced by `CallTimesPage.tsx` at `/call-times`. The
> "non-map accessible list" this spec required is what's left, now the primary interface rather
> than a fallback, extended with state and time-zone filters. D3/TopoJSON/us-atlas dependencies
> removed (gzipped bundle: 248.72 KB → 205.69 KB). See CLAUDE.md D-34.

**Goal:** Show Tim his leads geographically on a US map, filterable by status and city, so he can
see where his opportunities cluster.

**Depends on:** T01, T02 (lead data).

> **Note:** the Map exists in the prototype but has no requirement of its own in the spec (gap
> G3 in `../00-development-plan.md` §6). It is included in M0 because it's part of the working
> Phase-1 experience.

## In scope

- A US map with a pin per lead, color-coded by status.
- Filters by status and by city, with a clear way to clear filters.
- Selecting a pin (or a lead in an accompanying list) reveals that lead's key facts and a path into
  the full detail (T05) and call action.
- A non-map equivalent: an accessible list of the same filtered leads, so the information is fully
  available without relying on the visual map.
- TZ-01 local-time cues carried through here as on the cards.

## Out of scope

- Routing/directions or any live geodata service.

## Constraints

- Project-wide constraints (`../00-development-plan.md` §3).
- **Accessibility is the key risk here:** a visual map is not usable via JAWS on its own. The
  filtered lead information must be fully available in an accessible text/list form, and selection
  state and filter changes must be announced. The map is an enhancement on top of that, not the
  only way to get the information.
- Map library must be commercially licensed (the prototype uses D3 + TopoJSON, which are).

## Acceptance criteria

- Pins render for all leads with correct status colors; filters narrow them correctly.
- Selecting a lead surfaces its details and the path to full info / call.
- A JAWS user can reach, filter, and act on exactly the same leads without using the visual map.

## How — Claude Code decides

Map rendering approach, projection, and how the accessible equivalent is presented are yours,
within the constraints.

## References

- Spec v1.2: TZ-01; Technology Stack (D3 + TopoJSON); gap analysis G3
- Prototype: `USAMap`, `MapPage` (reference only)
