# M2-T00 — Clay.com account & enrichment field schema

**Status:** Testing complete (2026-08-10). Schema confirmed against two leads in a Clay test workbook (Ford — large/public, and Visit Dallas — small/non-public) seeded from real SalesForge/LACRM leads via the live app. See "Confirmed field schema" and "Flagged gaps" below.

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

## Confirmed field schema (tested 2026-08-10)

Tested in Clay's UI against two rows in a test workbook: **Ford** (ford.com — large, publicly traded, chosen to prove the pipe works) and **Visit Dallas** (visitdallas.com — small, non-public destination-marketing org, chosen to stress-test a realistic lead).

| Field | Clay source | Type | Ford result | Visit Dallas result | Maps to REQ-03 criterion |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Employee count | structured lookup | number | 184,605 | 91 | Employees |
| Revenue | structured lookup | number (raw dollars, not bucketed) | 187,267,000,000 (~$187B) | 32,068,498 (~$32M) | Revenue $25M+ |
| Industry | structured lookup | **NAICS code** (string, not plain text) | `336111` (Automobile Manufacturing) | NAICS code returned, same format | none directly (REQ-02 category; feeds T03 keyword-matching concern below) |
| Marketing dept + events | Claygent (AI Web Researcher), one combined call | Yes/No + free-text reason, per question | Yes/Yes with reasons | Yes/Yes with reasons | Has Marketing Dept, Has Events |

Both structured-lookup fields (employees, revenue) returned populated, plausible values on **both** a public company and a non-public org — revenue data was not blank or unavailable for Visit Dallas as initially hypothesized. Claygent also returned clean, confident Yes/No + reasons on both rows, no hedging observed.

## Credit cost & budget impact

| Row | Cumulative workbook total (after row ran) | Cost attributable to that row |
| :-- | :-- | :-- |
| Ford (all 4 fields) | 8 credits / 4 actions | 8 credits / 4 actions |
| Visit Dallas (all 4 fields) | 21 credits / 9 actions | **13 credits / 5 actions** |

The three structured-lookup fields (employees, revenue, industry) cost ~1 credit/action each on both rows (~3 credits/3 actions flat). The variable cost is **Claygent**: ~5 credits on Ford vs. ~10 credits on Visit Dallas — the less-famous, less-documented lead cost *more*, not less, because Claygent needed more research steps to find the same information. This inverts the naive assumption that obscure leads are cheaper to enrich.

Using the observed worst case (13 credits/lead) against the free tier's 100 Data Credits/month: **100 ÷ 13 ≈ 7–8 leads/month** — the low end of `M2-00-index.md`'s existing 5–30/month estimate, not the middle or high end. T00a's credit guard should size its cap assuming ~13 credits/lead, not the original range's optimistic 3-credit floor.

## Flagged gaps

Per this task's acceptance criteria ("any gap Clay can't source is flagged back to Drew, not silently left on the proxy/inference workaround"):

1. **Order frequency (S-07, "Orders Multiple Times/Year") — not sourceable from Clay at all.** No Clay provider offers this; it's the lead's order history *with Drew's business*, not general company data any third-party enrichment tool would have. Real fix: pull from LACRM's own deal/order history in T02/T03, not from Clay.
2. **Promo purchase history (S-06, "Ordered Promo Products") — same gap, same reason.** Same fix as above.
3. **Industry returns a NAICS code, not plain text.** The current scoring code (`src/scoring/scoreLead.ts` S-04/S-05) does keyword matching on industry as free text ("market", "event", "trade show", etc.); a raw NAICS code (e.g. `336111`) won't match any of those keywords. T03 will need either a NAICS-code lookup table or to source S-04/S-05 from Claygent instead (which this test shows works well) rather than the industry field.
4. **Claygent cost scales with how obscure the lead is, not down.** Confirmed above — feeds directly into T00a's credit-guard sizing, not just a documentation note.

## How — Claude Code decides

Not applicable — this is Drew's setup/decision task. If Claude Code is asked to review the schema against scoring needs, its output is a gap analysis, not new code.

## References

- Spec v1.2: REQ-02 (approved scope), REQ-03 (Scoring Criteria table), D-05
- PROFORMA-STATE.md / Known Issues: REQ-03 revenue-proxy note
