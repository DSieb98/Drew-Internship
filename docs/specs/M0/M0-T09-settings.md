# M0-T09 — Settings (REQ-12, DV-01, all configurable values)

**Goal:** One place where Greg or Drew can tune the system's behavior without a code change — every
value the scoring, status, alerting, nurture, and deal-value features depend on.

**Depends on:** T01. Tightly coupled with T03 (scoring reads these values; build together or this
first).

## In scope

A Settings view exposing, at minimum, all of these configurable values:

- **Score threshold** (REQ-03) — the qualification cutoff.
- **Hot/Warm/Cold status thresholds** (REQ-12, new) — the score-to-status cutoffs. This is the
  item that does **not** yet exist in the prototype.
- **Hot-alert deal value** (REQ-07) — minimum deal value that triggers the dashboard alert.
- **Employee tiers** and **revenue tiers** (REQ-03) — the 4-tier configurable ranges and points.
- **Promo-order points** (REQ-03) — the interest / one-order / multiple points.
- **Nurture silence threshold** (REQ-10) — days silent before a cold lead enters nurture.
- **Deal-value thresholds** (DV-01) — the High/Medium/Low cutoffs (currently hardcoded at $25K /
  $10K); make them configurable here.
- **Basic validation** on range inputs — e.g., reject/flag a tier where min > max (the prototype
  currently allows this).
- Changes apply immediately on save and visibly affect the relevant features.

## Out of scope

- Settings that belong to later milestones' features that don't exist yet (those settings land with
  their features).

## Constraints

- Project-wide constraints (`../00-development-plan.md` §3).
- No value that this page is meant to control may be hardcoded elsewhere — Settings is the single
  source for these tunables.
- Accessibility: every field is labeled with help text; validation errors are announced and tied to
  their field; save confirmation is announced.

## Acceptance criteria

- Each listed value is editable and, on save, immediately changes the behavior it governs (score,
  derived status, alert, deal-value label, nurture entry).
- Invalid tier ranges (min > max) are caught and surfaced, not silently accepted.
- A JAWS user can find, change, and confirm any setting.

## How — Claude Code decides

Form layout, grouping, validation mechanism, and how settings propagate are yours, within the
constraints.

## References

- Spec v1.2: REQ-03, REQ-07, REQ-10, REQ-12, DV-01, D-10, D-11, D-15; Known Issues (tier validation)
- Prototype: `SettingsPage`, `DEFAULT_SETTINGS`, `dealValueLabel` (reference only — note DV-01
  thresholds are hardcoded there and the REQ-12 status thresholds are absent)
