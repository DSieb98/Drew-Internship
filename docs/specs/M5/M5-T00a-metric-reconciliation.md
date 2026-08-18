# M5-T00a — Reconcile REQ-11 metrics against Instantly.ai's status

**Goal:** Resolve the gap between REQ-11's approved metric list and current reality — two of its six metrics (emails sent, response rate) were scoped assuming Instantly.ai (REQ-05/06) would be live.

**Depends on:** —

**Owner:** Drew (scope decision). Not a Claude Code task — this is a decision about what REQ-11 should even measure, which belongs to Drew per D-14 (decision authority).

> **Status as of 2026-08-11:** this task's scope below (assume "no data source, decide
> drop/proxy/placeholder") is accurate again. Instantly.ai/M3 was briefly reactivated 2026-08-10,
> then put back to deferred the next day after Drew talked it through with his mentor (`CLAUDE.md`
> D-28) — the door was explicitly left open to revisit M3 later, and `M3-T03-lacrm-writeback.md`'s
> draft spec is what would eventually supply this data if that happens. Proceed with the
> drop/proxy/placeholder decision below; just don't present it to Tim as permanent. See
> `docs/specs/M5/M5-00-index.md`'s scope-problem note.

## Resolved (2026-08-18, see CLAUDE.md D-37)

Drew's call: **placeholder**, not drop or proxy. "Emails sent" and "Response rate" stay in
REQ-11's metric list but render as an explicit "pending" state (e.g. "N/A — pending outreach
automation") in the eventual dashboard (T02), consistent with the project's established
deferred-features-stay-visible pattern (M4). No manual/proxy substitute — Tim's call-log notes
weren't treated as a real stand-in for either metric. Revisit for real if/when M3 is ever
un-paused and `M3-T03-lacrm-writeback.md` lands real send/reply data.

T00's Tim session (`M5-T00-tim-gap-analysis.md`) can proceed on this basis — the candidate metric
list Tim reacts to should show these two as "pending," not silently absent and not presented as
permanently gone.

## In scope

- For **emails sent** and **response rate**: decide one of —
  - Drop the metric entirely from REQ-11's scope, since there's no automated send/reply-capture to measure it from.
  - Replace it with a manual/proxy equivalent — e.g., if Tim logs outreach manually in LACRM (activity notes, call logs), whether that data is countable as a rough substitute.
  - Leave it as a placeholder metric that shows "N/A — requires Instantly.ai" (or, now, "pending M3") in the eventual dashboard (T02), rather than silently omitting it — consistent with the project's "deferred features appear as visible placeholders, not silent omissions" pattern.
  - Treat this as blocked-on-M3 rather than blocked-forever — revisit if/when M3 (currently deferred, D-28) is ever un-paused and `M3-T03` (LACRM write-back for email activity) actually lands real data.
- Documenting the decision and updating REQ-11's metric list so **T00 (Tim's gap-analysis session)** and **T01 (data source mapping)** work from a current list, not the stale June 2026 one in Spec v1.2.
- A brief note on whether this reconciliation should also prompt an update to Spec v1.2 itself (a versioning decision, not this task's scope to execute — just to flag).

## Out of scope

- Re-litigating whether Instantly.ai itself should be built — that's M3's scope (D-28), not this task's.
- The other four REQ-11 metrics (leads qualified, alerts triggered, boxes sent, cost per lead) — those aren't affected by this gap and are T01's scope.
- Running Tim's actual gap-analysis session — that's T00.

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- Deferred/dropped features must remain visible as placeholders in the UI rather than silently disappearing (established project pattern) — applies to whatever this task decides for emails-sent/response-rate.

## Acceptance criteria

- A documented decision exists for each of the two affected metrics (drop / proxy / placeholder / pending-M3), with rationale.
- The REQ-11 metric list going into T00's Tim session reflects this reconciliation — Tim isn't asked to react to metrics that quietly can't exist (or told they're impossible when M3 might deliver them).
- If Spec v1.2 should be versioned to reflect this, that's flagged to Drew as a follow-up, not silently left inconsistent.

## How — Claude Code decides

Not applicable — scope/decision task, Drew's call.

## References

- Spec v1.2: REQ-11 (approved scope), REQ-05, REQ-06
- Deferred-features-as-visible-placeholders pattern (established project approach)
- `docs/specs/M3/M3-T03-lacrm-writeback.md` — the task that could make this reconciliation moot
