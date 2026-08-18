# M3-T01 — Automated send integration

**Goal:** Extend the already-built AI draft tab (REQ-05's built portion: draft generation + mailto/clipboard fallback) so it can also hand a lead's 3-email sequence to Instantly.ai for actual automated sending, rather than requiring Tim to send each email manually.

**Depends on:** T00 (credential access).

**Owner:** Claude Code (SalesWhiz-side integration) + Drew (Instantly.ai sequence/campaign configuration).

## In scope

- Wiring the existing draft-tab UI to an "automated send" option alongside the current mailto/clipboard options — not replacing them. Manual copy-paste stays available (REQ-05 explicitly allows it) as a fallback if Tim prefers it for a given lead or if Instantly.ai is unavailable.
- Sending the 3-email sequence structure Instantly.ai is configured for: Introduction, Qualification, Sample Box offer — per REQ-05's approved scope.
- Confirming to Tim (via the existing UI patterns — plain-text confirmation, not a silent background action) that a sequence was actually queued/sent, since automated send removes the manual "I just hit send" moment Tim currently has.
- JAWS accessibility for the new send-confirmation flow per PRINCIPLE-03 — aria-live announcement on send confirmation, not a silent visual-only state change.

## Out of scope

- Reply capture (T02).
- Writing send records to LACRM (T03).
- Changing the AI drafting logic itself — this task only adds a new delivery path for drafts that already exist.

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- Manual mailto/clipboard path must remain available, not be removed in favor of automated-only send.
- No lead PII sent to Instantly.ai beyond what the sequence itself requires (name, email, company — same PII scope already established for other integrations per Spec v1.2 §1a).

## Acceptance criteria

- Tim can trigger an automated send for a lead's sequence from the existing draft tab.
- The manual mailto/clipboard option still works exactly as before.
- A JAWS-announced confirmation follows a successful automated send.
- A failed send (Instantly.ai API error) is visibly surfaced to Tim, not silently swallowed.

## How — Claude Code decides

UI placement of the automated-send option within the existing draft tab, and the specific confirmation/error-state design, are Claude Code's call within PRINCIPLE-03's constraints.

## References

- Spec v1.2: REQ-05 (approved scope, what's built), §1a (PII scope)
- M3-T00 (credential dependency)
