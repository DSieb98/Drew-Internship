# M3 — Enrichment & Automation (REQ-02, Make.com)

**Goal:** Replace the keyword-inference stand-ins in scoring with real enrichment data from
Clay.com, and orchestrate the upstream pipeline (intake → enrichment → CRM) with Make.com, so leads
arrive enriched and scored without manual steps.

**Gated by:** M1 complete (enrichment data must land somewhere durable — LACRM).

---

## Why this milestone exists

Today the scoring engine infers criteria like revenue, events, and order history from keywords in
the notes field, and uses `dealValue` as a revenue proxy. Real enrichment (REQ-02) substantially
improves score accuracy. Make.com is the approved automation layer (D-04) that ties intake,
enrichment, and CRM together so the pipeline runs without hand-offs.

## In scope

- **REQ-02 — Clay.com enrichment:** enrich leads with the approved attributes (industry, revenue,
  buying signals, order frequency, employee count) and feed those real values into the existing
  scoring model in place of the keyword/proxy inferences.
- **Make.com orchestration:** automate the flow from lead intake through enrichment into LACRM, so
  a new lead progresses through the pipeline stages without manual intervention.
- Update the scoring inputs so the criteria that were keyword-inferred now use enriched data where
  available, while remaining resilient when a field is missing.

## Out of scope

- Changing the approved scoring weights or criteria (those are locked unless revisited with Greg
  and Tim).
- Email outreach (M4 / deferred) and reporting (M5).

## Constraints

- All project-wide constraints (`00-development-plan.md` §3). Clay.com and Make.com must be
  commercially licensed (PRINCIPLE-02) — both are already approved.
- Enriched data is LACRM-backed (PRINCIPLE-01).
- Browser-only applies to the SalesForge app; Make.com and Clay.com are external services
  orchestrated around it. How the browser app consumes enriched results (vs. what runs in
  Make.com) is a design question to resolve within this milestone, consistent with the M1
  verification findings.
- **PII:** enrichment moves lead data through external services — keep handling consistent with
  spec §1a and update that section's understanding as data begins flowing through Clay/Make.

## Acceptance criteria

- A lead enriched via Clay.com shows real attribute values, and its score reflects those values
  rather than keyword inference.
- A new lead can move through intake → enrichment → LACRM via Make.com without a manual step.
- Scoring degrades gracefully (no crash, sensible fallback) when an enriched field is unavailable.

## How — Claude Code decides

Make.com scenario structure, how/where enrichment is triggered, the mapping of Clay fields to
scoring inputs, and the integration boundary between the browser app and the automation layer are
all yours, within the constraints above.

## References

- Spec v1.2: REQ-02, REQ-03 (scoring model + revenue-proxy note), D-04, D-05; Technology Stack
  (Clay.com, Make.com rows)
- Depends on: M1 (LACRM as the durable store for enriched data)
