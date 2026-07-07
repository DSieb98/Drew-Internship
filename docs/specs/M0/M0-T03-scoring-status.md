# M0-T03 — Scoring engine & status derivation (REQ-03, REQ-12)

**Goal:** Score every lead with the approved model, show Tim why it got that score, and derive each
lead's Hot/Warm/Cold status from its score using a threshold Tim/Greg/Drew can change without code.

**Depends on:** T01; T09 (Settings provides the thresholds, tiers, and points this task reads).

## In scope

- **REQ-03 — scoring:** the approved 8-criterion, 100-point model. The criteria and their maximum
  weights are fixed (locked unless revisited with Greg and Tim):

  | Criterion | Max | Logic |
  | :-- | :-- | :-- |
  | USA Based | 7 | location present |
  | Employees | 11 | configurable tiers (Settings) |
  | Revenue $25M+ | 11 | configurable tiers; `dealValue` proxy until Clay enrichment (M3) |
  | Has Marketing Dept | 7 | industry match |
  | Has Events | 11 | keyword signal |
  | Ordered Promo Products | 15 | 3 levels (interest / one / multiple); points configurable |
  | Orders Multiple Times/Year | 15 | keyword signal |
  | Immediate Need | 23 | urgency signal |

- A visible per-criterion **breakdown** so Tim can see what earned points and what didn't.
- **REQ-12 — status derivation:** compute Hot/Warm/Cold from the lead's score using the
  configurable score-to-status threshold(s) from Settings. Status and score are related but
  tracked separately, and **Tim can manually override status** regardless of score.
- Re-score automatically when the inputs or the relevant Settings values change.

## Out of scope

- Real enrichment data feeding the criteria (M3) — until then, keyword inference and the
  `dealValue` revenue proxy are the inputs, and that's acceptable.
- Editing the criteria/weights in the UI (not a requirement).

## Constraints

- Project-wide constraints (`../00-development-plan.md` §3).
- All tunable values (score threshold, status thresholds, employee tiers, revenue tiers, promo
  points) come from Settings (T09) — none hardcoded.
- Accessibility: the score and its breakdown must be readable by JAWS, not conveyed by color alone.
- Scoring must not crash when an input field is missing; fall back sensibly.

## Acceptance criteria

- Each lead shows a 0–100 score with a per-criterion breakdown that matches the model.
- Changing a tier, points value, or threshold in Settings re-scores leads / re-derives status
  immediately, with no code change.
- A manual status override sticks and is not undone by the next re-score.

## How — Claude Code decides

How signals are detected, how the breakdown is represented, and how re-scoring is triggered are
yours, within the constraints.

## References

- Spec v1.2: REQ-03 (criteria table), REQ-12, D-10, D-15; Known Issues (revenue proxy)
- Prototype: `calcScore`, `ScoreBadge`, `DEFAULT_SETTINGS` (reference only — note the prototype's
  status is static demo data, i.e. REQ-12 is *not* yet implemented there)
