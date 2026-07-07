# M0-T02 — Lead import (REQ-01)

**Goal:** Let Tim bring leads into the app from an Excel/XLSX spreadsheet, entirely in the browser,
with a chance to map columns and preview before committing.

**Depends on:** T01.

## In scope

- In-browser parsing of an Excel/XLSX (and CSV) file — no upload to any server.
- A column-mapping step so the spreadsheet's columns can be matched to the lead fields the app
  uses, with sensible auto-guesses the user can correct.
- A preview of the parsed leads before the user confirms the import.
- On confirm, the leads enter the app's working (in-memory, M0-scope) state and become visible in
  the lead views.
- An accessible, multi-step flow (the import is a focus-trapped dialog) with progress and outcome
  announced to JAWS.

## Out of scope

- External data sources (Apollo.io, ZoomInfo, LinkedIn) — Phase 2+.
- Writing imported leads to LACRM (M1).

## Constraints

- Project-wide constraints (`../00-development-plan.md` §3).
- **PII (spec §1a):** all parsing happens client-side; no lead data leaves the browser during
  import.
- Fully JAWS-operable: the file picker, mapping controls, preview, and confirm/cancel must all be
  reachable and labeled; errors (bad file, unmappable columns) are announced, not silent.

## Acceptance criteria

- A real lead spreadsheet imports successfully and the leads appear, correctly mapped, in the app.
- The user can correct a wrong column mapping before confirming.
- A malformed or empty file produces a clear, announced error rather than a crash.
- No network request carries lead data during import.

## How — Claude Code decides

Parsing library (the prototype uses SheetJS, which is commercially licensed), mapping UI, and the
working lead representation are yours, within the constraints.

## References

- Spec v1.2: REQ-01, §1a (PII), D-01
- Prototype: `ImportModal`, `guessMapping`, `rowToLead` (reference only)
