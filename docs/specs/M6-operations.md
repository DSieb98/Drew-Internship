# M6 — Operations

**Goal:** Make the live system observable and sustainable — monitoring, cost tracking, and ongoing
optimization — once M1–M5 are running in production.

**Gated by:** M1–M5 live in production.

---

## Why this milestone exists

The spec lists Operations as Phase 5 ("not yet scoped"): monitoring, cost tracking, and ongoing
optimization. Once the pipeline and app are real and in use, someone needs to be able to see that
they're working, catch failures, and keep external-service costs in check.

## In scope (to be refined with Drew when the system is live)

- **Monitoring:** visibility into whether the pipeline and sync are healthy — failed imports,
  failed LACRM syncs, enrichment errors, API failures — surfaced where Drew (and where relevant,
  Tim) will actually notice them.
- **Cost tracking:** track spend on the external services in use (Anthropic API, Clay.com,
  Make.com, LACRM), consistent with the cost-discipline practices already established for the
  project (cheapest model that does the job; hard caps on any API key; one key per service).
- **Optimization:** an ongoing, low-priority track for tuning scoring accuracy, sync reliability,
  and cost per lead against the business goal (25–50 qualified leads/month at ~$1–3/lead).

## Out of scope

- New end-user features — those would be their own requirements/milestones.

## Constraints

- All project-wide constraints (`00-development-plan.md` §3).
- Cost discipline: align with the project's existing spending model — Claude on the flat Pro plan
  for day-to-day work (D-06); any API key used by the pipeline gets a hard monthly cap, one key per
  service, and unused keys deleted.
- Never expose secrets or PII in monitoring/logging output.

## Acceptance criteria

- A failure in import, sync, or enrichment is detectable rather than silent.
- External-service spend is visible and bounded by hard caps.
- There is a documented, repeatable way to review and tune the system against the lead-throughput
  and cost-per-lead goals.

## How — Claude Code decides

What to monitor and how, the form of cost tracking, and the optimization cadence are yours, within
the constraints above and whatever scope Drew confirms when the system is live.

## References

- Spec v1.2: §9 Phase Summary (Phase 5 — Operations), business goal (§0), D-06
- Project setup guide: cost-discipline and spending-cap practices
- Depends on: M1–M5 in production
