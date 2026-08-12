# M2-T02 — LACRM enrichment write-back

**Goal:** Get Clay.com's enrichment results into LACRM as appended data on the lead record — never overwriting raw import data — so LACRM remains the single source of truth (PRINCIPLE-01) for enriched fields, not just imported ones.

**Depends on:** T00, T01, M1-T01 (LACRM field mapping), M1-T03 (lead record sync).

**Owner:** Drew (Make.com scenario extension) — or Claude Code, if the write path ends up going through the LACRM client M1-T01 built for SynetheixSales rather than a direct Make.com→LACRM API call. Which path is used is a decision this task should make explicit, not assume.

## In scope

- Deciding the write path: does Make.com write enrichment results directly to LACRM via its own LACRM connector/API call, or does it hand results to SynetheixSales's LACRM client (from M1) to write? Document the choice and why.
- Extending M1-T01's field-mapping layer to cover Clay's enrichment fields (industry, revenue, buying signals, order frequency, employee count) alongside the lead-record fields it already maps.
- Ensuring writes are additive: an enrichment write updates only the enrichment fields on an existing LACRM record, never touches or clobbers the raw import fields (company, contact, email, phone, etc.) already written by M1's sync.

## Out of scope

- The enrichment call itself (T01).
- Scoring engine changes that consume this data (T03).

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- PRINCIPLE-01 applies directly: LACRM is the source of truth for enrichment data too, not just lead-record basics. No enrichment data should live only in Make.com's execution history or only in SynetheixSales's local state.
- REQ-02's own acceptance criteria: "Enrichment results are appended to the lead record (not overwriting raw import data)" and "If enrichment fails for a lead, it is flagged and queued for retry — pipeline continues."

## Acceptance criteria

- A successful enrichment (from T01) results in the corresponding LACRM record showing the new enrichment fields, with all previously-synced fields unchanged.
- The write path decision (Make.com-direct vs. via SynetheixSales's LACRM client) is documented with rationale.
- A lead re-synced or re-viewed in SynetheixSales (via M1's store) shows the enriched fields without any additional manual step.

## How — Claude Code decides

If the write path chosen routes through SynetheixSales's LACRM client, the specific code change (extending M1-T01's mapping layer) is Claude Code's call within the constraints above. If the write path is Make.com-direct, this task is Drew's Make.com config work and Claude Code's role is limited to reviewing the field-mapping documentation for consistency with M1's existing mapping.

## References

- Spec v1.2: REQ-02 (acceptance criteria), PRINCIPLE-01
- M1-T01-lacrm-client-mapping.md, M1-T03-lead-stage-sync.md
