# M2-T00 — Clay.com account & enrichment field schema

**Goal:** Set up Clay.com access and define exactly which enrichment fields it will return per lead, so downstream tasks (Make.com trigger, LACRM write-back, scoring engine) have a fixed schema to build against instead of guessing at Clay's output shape.

**Depends on:** —

**Owner:** Drew (Clay.com account/config). Claude Code's role is limited to reviewing the proposed schema against what REQ-03's scoring criteria actually need, and flagging gaps — not building this task.

## In scope

- Clay.com account/workspace setup (or confirmation it already exists) and API access.
- Defining the enrichment field set Clay will return per REQ-02's approved scope: industry classification, revenue range, buying signals (promo history, trade show activity), spending potential estimate, estimated order frequency, employee count.
- Cross-checking that field set against what REQ-03's scoring criteria table actually consumes (Employees, Revenue $25M+, Has Marketing Dept, Has Events, Ordered Promo Products, Orders Multiple Times/Year) so nothing scored today is left without a real-data source.
- Documenting the field schema (names, types, expected value ranges/enums) in a form T01–T03 can build against.

## Out of scope

- Building the Make.com scenario that calls Clay (T01).
- Writing enriched data to LACRM (T02).
- Changing the scoring engine itself (T03) — this task only makes sure the right fields will exist.

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- PRINCIPLE-02: Clay.com must be commercially licensed/contracted appropriately before use (D-05 already approved the tool; this task covers actually provisioning it).
- Enrichment fields are appended to a lead record, never overwrite raw import data (REQ-02 acceptance criteria) — the schema should be designed so it's additive by construction, not just by convention.

## Acceptance criteria

- Clay.com account is active with API access confirmed working (a single test enrichment call succeeds).
- A documented field schema exists covering all five REQ-02 categories, with each field's name/type/expected values specified.
- Every REQ-03 scoring criterion that currently relies on the `dealValue` proxy or notes-field keyword inference has an identified real-data field in this schema that will replace it.
- Any gap (a scoring criterion Clay can't actually source) is explicitly flagged back to Drew rather than silently left on the proxy/inference workaround.

## How — Claude Code decides

Not applicable — this is Drew's setup/decision task. If Claude Code is asked to review the schema against scoring needs, its output is a gap analysis, not new code.

## References

- Spec v1.2: REQ-02 (approved scope), REQ-03 (Scoring Criteria table), D-05
- PROFORMA-STATE.md / Known Issues: REQ-03 revenue-proxy note
