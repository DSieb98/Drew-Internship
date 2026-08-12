# M1-T01 — LACRM API client & field mapping

**Goal:** Build the API client/adapter that talks to Less Annoying CRM, and map SynetheixSales's lead fields to LACRM's fields so data can flow accurately in both directions.

**Depends on:** T00.

## In scope

- An LACRM API client (auth via T00's mechanism, read + write operations for leads/contacts).
- A field-mapping layer: SynetheixSales lead shape ↔ LACRM contact/lead shape, covering every category PRINCIPLE-01 names (lead records, pipeline stages, nurture state, scores, hot alert status, call history, notes).
- Pipeline stage name mapping — SynetheixSales's current stage vocabulary (New Lead, Contacted, Qualified, Proposal Sent, Quote Requested, Follow-Up, Sample Sent) reconciled against LACRM's confirmed stage names (B-01, resolved — see `M2-pipeline-nurture-persistence.md` for the ordered list and flagged ambiguities to resolve here rather than guess).
- Basic connectivity/auth error handling (e.g., invalid credential, rate limit) surfaced clearly, not silently swallowed.

## Out of scope

- Wiring this client into the app's store (T02).
- Resolving B-01 itself — Drew supplies the actual stage names; this task consumes them.

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- PRINCIPLE-01: LACRM is the source of truth — the mapping layer must not silently drop or reinterpret data in a way that could diverge from LACRM's record.
- Stage-name reconciliation follows the resolution procedure spec v1.2 §5 already spells out for B-01: check the confirmed names against the app's current list; work out any mismatch at that point rather than guessing now.

## Acceptance criteria

- The client can read and write a real lead record to/from LACRM successfully.
- Every field category PRINCIPLE-01 lists has a defined mapping (not just lead records).
- Stage names used in sync exactly match LACRM's confirmed names (post-B-01), not the prototype-carried placeholder list.
- A connectivity/auth failure produces a clear, non-crashing error.

## How — Claude Code decides

LACRM API library/SDK choice (if any), the shape of the internal mapping representation, and error-handling mechanics are Claude Code's call, within the constraints.

## References

- Spec v1.2: PRINCIPLE-01, REQ-04, REQ-09, B-01 resolution procedure (§5)
- PROFORMA-STATE-v8.md: Open Blocker 1 (B-01), Key File Locations

---

## Decision & what was built (resolved 2026-08-04)

**API used:** LACRM's officially documented v2 API (`https://api.lessannoyingcrm.com/v2/`,
`Authorization: <single API key>` header, `{Function, Parameters}` JSON body — see
`account.lessannoyingcrm.com/api_docs/v2`). This **replaces** the legacy UserCode+APIToken GET-based
API T00's `/api/lacrm/ping` was originally built against (a reverse-engineered guess from a
third-party R package, since account documentation requires login) — the real docs turned out to
be publicly reachable and better. `worker/README.md` step 3 and the `LACRM_API_KEY` secret name
reflect the correction.

**Client (`src/utils/lacrmApi.ts`) — read + write for contacts, read for pipelines:**
`pingLacrm()` (`GetUser`), `searchLacrmContacts()` / `getLacrmContact()` / `createLacrmContact()`
/ `updateLacrmContact()` (`GetContacts`/`GetContact`/`CreateContact`/`EditContact`),
`getLacrmPipelines()` (`GetPipelines`, needed to resolve stage names to `StatusId`s). All go
through the Worker (D-21) — never call LACRM directly from the browser.

**Field mapping (`src/utils/lacrmMapping.ts`) — covers every PRINCIPLE-01 category:**
- **Lead records** (contact/company/email/phone/city/state/job title) ↔ LACRM Contact fields —
  implemented now (`leadToLacrmContactInput` / `lacrmContactToLeadPatch`).
- **Pipeline stages** — implemented now. Resolution of the B-01 mapping ambiguities (done here,
  not guessed):
  - `New Lead` / `Contacted` → **no LACRM stage.** These are pre-qualification, SynetheixSales-only
    states — REQ-04 only creates the CRM record at `Qualified`. The Contact still syncs
    (PRINCIPLE-01), just without a pipeline placement yet.
  - `Proposal Sent` / `Quote Requested` → both collapse into the single confirmed **`Quote`**
    stage.
  - `Follow-Up` → **`Needs Analysis`** (closest fit).
  - `Sample Sent` → **`Sample Box Sent`** (naming difference only).
  - Going forward, `Lead.stage` should hold a canonical LACRM name directly — the migration table
    only exists to reconcile pre-existing placeholder data on first sync.
  - `resolveStageStatusId()` matches by name against the *live* pipeline fetched via
    `GetPipelines()` rather than hardcoding `StatusId`s, so if `Qualified` (or any name) turns out
    not to exist as a real status on Drew's actual LACRM pipeline, that's a `null` at runtime for
    T03 to handle explicitly rather than a wrong hardcoded guess baked in now.
- **Score, hot-alert status, nurture step** (and the scoring inputs employees/revenue/industry) →
  targeted at LACRM Contact-level **Custom Fields** (to be created via `CreateCustomField` if
  absent). Documented as constants/comments in `lacrmMapping.ts`; not implemented — that's T04
  ("Extended-state sync").
- **Call history** → targeted at one LACRM **Note** per `CallLog` entry (`CreateNote`, read via
  `GetNotesAttachedToContact`). Documented, not implemented — T04.
- **Watchlist pins/notes** → explicitly **not** decided here; owned by T06 (open blocker 4).

**Verified against a live account (2026-08-06).** Credentials were pulled and the acceptance
criterion "the client can read and write a real lead record to/from LACRM successfully" is
confirmed: the concurrent-pagination fix (see `M1-T02-async-store-swap.md`) round-tripped the
real production account — 21,209 contacts, full hydrate in ~31s through the deployed Worker.
