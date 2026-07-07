# M0-T01 — App shell, navigation & accessibility baseline

**Goal:** Stand up the production app scaffold that every other M0 feature mounts into, with the
JAWS accessibility baseline established from the start.

## In scope

- The deployable, runnable browser-only app skeleton, including whatever build/deploy form Claude
  Code selects (and a short note documenting that choice).
- Top-level navigation across the product's sections: Today, All Leads, Map, History, My List,
  Nurture (placeholder in M0), Reports (placeholder in M0), Settings.
- Page routing between those sections and a way to return from sub-views (e.g., an explanation
  page) to where the user was.
- The accessibility baseline that all later tasks rely on:
  - A skip-to-content link as the first focus stop.
  - Section navigation using a `<nav>` landmark with standard links and `aria-current="page"`
    on the active link. Standard Tab key navigation between links — no arrow-key cycling or
    roving-tabindex. ARIA tablist is not used here; links are the correct pattern for JAWS
    users navigating between sections.
  - A polite live region for transient status messages/toasts.
  - Semantic landmarks (header, nav, main) and a sensible heading structure.
- A global, reusable way to fire status announcements and to open/close focus-trapped dialogs, so
  later tasks don't each reinvent it.

## Out of scope

- The actual content of each page (their own tasks). Nurture and Reports are visible placeholders
  in M0.

## Constraints

- Project-wide constraints (`../00-development-plan.md` §3); PRINCIPLE-03 especially.
- Nurture and Reports must appear as honest "coming later" placeholders, not hidden — the project
  pattern is visible placeholders, not silent omissions.

## Acceptance criteria

- Every section is reachable and the active section is announced correctly to JAWS.
- The whole nav is one focus group navigable by arrow keys; skip link works as the first stop.
- A status message triggered anywhere is announced via the live region without stealing focus.
- The app builds and runs in its chosen production form.

## How — Claude Code decides

Framework, routing approach, build tooling, and deploy target are yours, within the constraints.

## References

- Spec v1.2: §1 PRINCIPLE-03 (accessibility patterns), §6 (8-tab nav confirmed manageable, D-12)
- Prototype `salesforge-v2.jsx`: header/nav/skip-link/live-region patterns (reference only)
