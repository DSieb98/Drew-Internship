# M0-T10 — Plain-language layer & onboarding (gap G4)

**Goal:** Keep the whole app understandable to Tim, a non-technical user: a "what does this mean?"
explanation system, a glossary, inline help, and a first-run tour.

**Depends on:** cross-cutting — the inline help attaches to controls across other tasks, so
integrate this as those surfaces land (the glossary and onboarding can be built early).

> **Note:** this plain-language layer isn't itemized as a requirement but directly serves
> PRINCIPLE-03 and the product's non-technical audience (gap G4 in `../00-development-plan.md`
> §6). Treat it as part of the product, not an extra.

## In scope

- An **explanation system**: small inline help affordances next to terms/metrics that open a clear,
  plain-language explanation of that term, with a way back to where the user was.
- A **glossary** the user can browse, listing the explainable terms with short descriptions.
- A **first-run onboarding tour** introducing the app and how to get help, skippable and
  re-openable.
- Plain-language copy throughout — jargon either avoided or explained inline.

## Out of scope

- Explanations for features that don't exist yet (add them as those features land).

## Constraints

- Project-wide constraints (`../00-development-plan.md` §3).
- Accessibility: help affordances are labeled and reachable; explanation views and the onboarding
  are focus-managed and announced; nothing depends on hover or visual-only cues.
- Plain language is the bar — explanations are for someone with no sales-tech background.

## Acceptance criteria

- Every explainable term has a reachable explanation, and the glossary lists them.
- The onboarding appears on first run, can be skipped, and can be reopened later.
- A JAWS user can trigger and read any explanation and complete/replay the tour.

## How — Claude Code decides

How explanations are registered and surfaced, glossary structure, and onboarding mechanics are
yours, within the constraints.

## References

- Spec v1.2: §1 PRINCIPLE-03; gap analysis G4
- Prototype: `ExplainPage`, `GlossarySheet`, `Onboarding`, `Help`, `EXPLANATIONS` (reference only)
