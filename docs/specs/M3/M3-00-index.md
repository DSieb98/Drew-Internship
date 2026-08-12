# M3 — Email Automation (Instantly.ai): task breakdown (deferred, kept as reference)

This folder splits milestone **M3** into discrete tasks. M3 covers **REQ-05 (Email Sequence — the
still-deferred automated-send half)** and **REQ-06 (Qualification Response Capture)** — the two
requirements fully owned by Spec v1.2's Phase 3. (REQ-07's push-alert half also nominally sits in
Phase 3, but that piece is declined per D-09/B-05 and stays out of scope here — its UI half was
already built under Phase 1.)

## Status: parked, not active (corrected 2026-08-11 — see D-28)

On 2026-08-10, this folder was briefly reactivated — the note below (kept for history) explains
the reasoning at the time. After talking it through with his mentor on 2026-08-11, Drew decided
**not** to reactivate M3 right now: Instantly.ai stays deferred, same as `D-04` originally said,
with the door left open to revisit later if priorities change. **`docs/specs/M4-outreach-alerts-deferred.md`'s
"deferred indefinitely" framing for REQ-05/06 is accurate again** — no edit needed there, since
reverting this decision restored what it already said.

The four task specs below (T00–T03) are kept in place, untouched, as ready-to-pick-up reference
for whenever M3 is revisited — not deleted, since real thought went into them and nothing about
rebuilding them later would be easier than picking this back up. **Do not treat this folder as
active work** until Drew explicitly says otherwise.

One thing this reversal does **not** undo: the nurture-engine spec that used to live in this
folder stays at `docs/specs/M7/` (moved 2026-08-10 when M3 was briefly reactivated). Moving it
back here would just be more churn for no benefit — the nurture engine is real, shipped, live-
verified code, and `M7` is now its permanent, correct home regardless of what M3 is doing.

<details>
<summary>Original reactivation note (2026-08-10), kept for history</summary>

M3 was retired earlier that session on the basis that Instantly.ai was "deferred indefinitely and
removed from the active roadmap." Drew asked to un-retire it and build REQ-05/REQ-06 anyway.
Flagged for the record at the time:

- **D-03** (Greg, Apr 2026 — email automation tool = Instantly.ai) was never formally rescinded.
  The "deferred indefinitely" language was a status note, not a decision reversal, so reactivating
  wasn't overriding a locked decision — it was resuming deferred work.
- Nothing about the underlying blockers had changed. REQ-05's automated-send piece and REQ-06 both
  still require the same client-side credential problem M1-T00 was scoped to solve (a static
  GitHub Pages site holding secrets for authenticated API calls) — now for Instantly.ai's API, not
  just LACRM's.

This reasoning wasn't wrong, exactly — it's still true that D-03 was never formally rescinded. But
Drew's mentor input on 2026-08-11 was to hold off building this now regardless, which is a
legitimate reason to stay deferred independent of whether the decision *could* be resumed.

</details>

## Build order (reference only — not being executed)

| Task | Name | Covers | Depends on | Owner |
| :-- | :-- | :-- | :-- | :-- |
| **T00** | Instantly.ai account & credential architecture | Account setup + how a static site authenticates to Instantly.ai's API without exposing secrets | M1-T00 (credential architecture spike — same underlying problem) | Drew |
| **T01** | Automated send integration | Wire the existing AI draft tab (already built: draft + mailto/clipboard) to Instantly.ai's actual 3-email automated sequence | T00 | Claude Code (SynetheixSales side) + Drew (Instantly.ai config) |
| **T02** | Reply/response capture | Capture buyer signals from email replies — role, purchase history, upcoming events, sample box interest | T00, T01 | Drew (Instantly.ai webhook/polling config) + Claude Code (consuming the data) |
| **T03** | LACRM write-back for email activity | Sent emails, replies, and captured signals land in LACRM per PRINCIPLE-01 | T01, T02, M1-T01/T03 | Drew + Claude Code (boundary task, same pattern as M2-T02) |

## What "done" would mean for M3, if revisited

Every lead's 3-email sequence (Introduction, Qualification, Sample Box offer) sends automatically through Instantly.ai instead of requiring Tim to manually mailto/copy-paste; replies are parsed for the four buyer signals REQ-06 specifies; and all of it — sends, replies, captured signals — lands in LACRM as the durable record, not just in Instantly.ai's own dashboard or SynetheixSales's in-memory state.

## References

- Spec v1.2: REQ-05, REQ-06, D-03, PRINCIPLE-01
- M1-T00 (credential architecture — direct dependency, if resumed)
- M2-00-index.md (same boundary-task and write-back pattern reused here for T03)
- `CLAUDE.md`: D-28 (reactivation, then reversal, both recorded there)
- `docs/specs/M7/M7-00-index.md` (where the nurture engine that used to live here now lives)
