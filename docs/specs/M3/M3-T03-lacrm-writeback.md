# M3-T03 — LACRM write-back for email activity

**Goal:** Get sent-email records, replies, and captured buyer signals into LACRM as the durable record — per PRINCIPLE-01, "email activity" is explicitly listed as data that must be governed by LACRM as source of truth, not left living only in Instantly.ai's dashboard or SalesWhiz's in-memory state.

**Depends on:** T01, T02, M1-T01 (LACRM field mapping), M1-T03 (lead record sync).

**Owner:** Drew (write-path config) + Claude Code (if the write goes through SalesWhiz's LACRM client), same boundary-task shape as M2-T02.

## In scope

- Deciding the write path, same question M2-T02 faced: does Instantly.ai/Make.com write directly to LACRM, or does SalesWhiz's LACRM client (from M1) handle it? Document the choice.
- Extending M1-T01's field-mapping layer to cover: sequence-sent status/date, reply received (yes/no, date), and the four captured buyer signals from T02.
- Ensuring writes are additive to the existing lead record, consistent with M1 and M2's write-back tasks — never overwriting fields owned by other sync paths.

## Out of scope

- The send/capture logic itself (T01, T02) — this task only gets the results into LACRM.
- Reporting on this data (that's M4's territory, if "emails sent"/"response rate" get revived there once a real source exists — see M4-T00a, which currently marks those metrics as sourceless specifically because this task didn't exist yet).

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- PRINCIPLE-01 applies directly — this is exactly the kind of data ("email activity") the principle calls out by name.

## Acceptance criteria

- A sent sequence and any captured reply signals appear on the corresponding LACRM record without manual entry.
- The write-path decision is documented with rationale, consistent with how M2-T02 documented its own.
- Re-viewing the lead in SalesWhiz (via M1's store) reflects the LACRM data without extra steps.

## How — Claude Code decides

Same as M2-T02: if the write path routes through SalesWhiz's LACRM client, the specific mapping-layer extension is Claude Code's call within PRINCIPLE-01. If Make.com/Instantly.ai writes directly, this is primarily Drew's config work with Claude Code reviewing mapping consistency.

## References

- Spec v1.2: PRINCIPLE-01 ("email activity" listed explicitly), REQ-05, REQ-06
- M1-T01, M1-T03; M2-T02 (same pattern, reused)
- `docs/specs/M5/M5-00-index.md` / `M5-T00a-metric-reconciliation.md` (flags this task as the eventual real source for M5's currently-sourceless emails-sent/response-rate reporting metrics)
