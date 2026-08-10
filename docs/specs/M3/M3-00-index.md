# M3 — Email Automation (Instantly.ai): task breakdown

This folder splits milestone **M3** into discrete tasks. M3 covers **REQ-05 (Email Sequence — the still-deferred automated-send half)** and **REQ-06 (Qualification Response Capture)** — the two requirements fully owned by Spec v1.2's Phase 3. (REQ-07's push-alert half also nominally sits in Phase 3, but that piece is declined per D-09/B-05 and stays out of scope here — its UI half was already built under Phase 1.)

## Reactivation note (Aug 2026)

M3 was retired earlier this session on the basis that Instantly.ai was "deferred indefinitely and removed from the active roadmap." Drew has since asked to un-retire it and build REQ-05/REQ-06 anyway. Flagging for the record:

- **D-03** (Greg, Apr 2026 — email automation tool = Instantly.ai) was never formally rescinded. The "deferred indefinitely" language was a status note, not a decision reversal, so this isn't overriding a locked decision — it's resuming deferred work.
- Nothing about the underlying blockers has changed. REQ-05's automated-send piece and REQ-06 both still require the same client-side credential problem M1-T00 was scoped to solve (a static GitHub Pages site holding secrets for authenticated API calls) — now for Instantly.ai's API, not just LACRM's.
- Recommend this gets a line in the next `PROFORMA-STATE` update (something like: *"M3 reactivated — Instantly.ai REQ-05/06 back in scope, D-03 stands"*) so a future session doesn't hit the same "wait, didn't we kill this?" confusion this session just had.

## Build order

| Task | Name | Covers | Depends on | Owner |
| :-- | :-- | :-- | :-- | :-- |
| **T00** | Instantly.ai account & credential architecture | Account setup + how a static site authenticates to Instantly.ai's API without exposing secrets | M1-T00 (credential architecture spike — same underlying problem) | Drew |
| **T01** | Automated send integration | Wire the existing AI draft tab (already built: draft + mailto/clipboard) to Instantly.ai's actual 3-email automated sequence | T00 | Claude Code (SalesForge side) + Drew (Instantly.ai config) |
| **T02** | Reply/response capture | Capture buyer signals from email replies — role, purchase history, upcoming events, sample box interest | T00, T01 | Drew (Instantly.ai webhook/polling config) + Claude Code (consuming the data) |
| **T03** | LACRM write-back for email activity | Sent emails, replies, and captured signals land in LACRM per PRINCIPLE-01 | T01, T02, M1-T01/T03 | Drew + Claude Code (boundary task, same pattern as M2-T02) |

## What "done" means for M3

Every lead's 3-email sequence (Introduction, Qualification, Sample Box offer) sends automatically through Instantly.ai instead of requiring Tim to manually mailto/copy-paste; replies are parsed for the four buyer signals REQ-06 specifies; and all of it — sends, replies, captured signals — lands in LACRM as the durable record, not just in Instantly.ai's own dashboard or SalesForge's in-memory state.

## References

- Spec v1.2: REQ-05, REQ-06, D-03, PRINCIPLE-01
- M1-T00 (credential architecture — direct dependency)
- M2-00-index.md (same boundary-task and write-back pattern reused here for T03)
