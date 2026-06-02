# ProForma Lead Gen — Functional Requirements
**Version:** 1.1 (sourced from ProForma_Lead_Gen_Requirements_v2.2.docx)
**Status:** For review — open decisions marked ⚠️

---

## REQ-01 · Lead Data Ingestion · HIGH
System must accept leads from an Excel (.xlsx / .csv) spreadsheet as the primary MVP input source.

**Acceptance criteria:**
- Accepts .xlsx and .csv files dropped into `data/`
- Validates required columns: company name, contact name, title, email, phone, location
- Rejects / flags rows with missing required fields without crashing the pipeline
- Future phases: Apollo.io, ZoomInfo, LinkedIn Sales Nav as automated sources

---

## REQ-02 · AI Lead Enrichment · HIGH
System must automatically enrich each lead via Clay.com with:
- Industry classification
- Revenue range
- Buying signals (promo history, trade show activity)
- Spending potential estimate
- Estimated order frequency (how many times/year they order promo products)

**Acceptance criteria:**
- Enrichment runs automatically after ingestion, before scoring
- Enrichment results are appended to the lead record (not overwriting raw import data)
- If enrichment fails for a lead, it is flagged and queued for retry — pipeline continues

---

## REQ-03 · Lead Scoring Engine · HIGH
System must score each lead against 8 criteria (max 100 points). See `lead-scoring.md` for weights.

**Acceptance criteria:**
- Score is computed deterministically from enriched fields
- Score and per-criterion breakdown are stored on the lead record
- ⚠️ Pass/fail threshold is **not yet set** — do not hard-code. Use a config value: `SCORE_THRESHOLD=0` until confirmed with Greg & Tim
- Leads at or above threshold → routed to REQ-04 and REQ-05
- Leads below threshold → routed to REQ-10 (nurture)

---

## REQ-04 · Less Annoying CRM — Auto-Create Record · HIGH
Upon passing the score threshold, system must automatically create a CRM record containing:
- Company name
- Contact name, title, email, phone
- Enrichment notes
- Tags (industry, score band, source)
- Lead score (numeric)
- Pipeline stage: "Qualified — Awaiting Email"

**Acceptance criteria:**
- Record created via Less Annoying CRM API within 60 seconds of scoring
- Duplicate check: if a record for this email already exists, update it rather than create a new one
- All PII fields handled per `.gitignore` / logging rules (never log to stdout)

---

## REQ-05 · Instantly.ai 3-Email Sequence · HIGH
System must enroll qualifying leads in the structured email sequence. See `email-sequence.md` for copy guidelines.

- **Email 1:** Introduction — no ask, relationship-opening, personalized to company/industry
- **Email 2:** Qualification questions — buyer role, promo history, upcoming events, immediate need
- **Email 3:** Sample box offer — close for the send, set up Tim's follow-up call

**Acceptance criteria:**
- Lead enrolled in Instantly.ai sequence automatically after CRM record creation
- Sequence timing configurable (not hard-coded)
- Unsubscribe / bounce handled per CAN-SPAM; record updated in CRM

---

## REQ-06 · Qualification Response Capture · HIGH
System must parse incoming email responses for qualifying signals:

| Signal | Description |
|--------|-------------|
| Buyer role | Is this person the decision-maker? |
| Orders promo products | Do they buy branded merchandise? |
| Recent purchase | Have they ordered in the past 12 months? |
| Upcoming events | Trade shows, company events, hiring cycles? |
| Immediate need | Do they have a near-term buying trigger? |
| Sample box interest | Do they want to receive a sample box? |

**Acceptance criteria:**
- Signals flagged automatically (AI-assisted parsing via Make.com / Clay)
- Signal summary appended to CRM record
- Leads meeting signal threshold → REQ-07 (hot lead alert)

---

## REQ-07 · Hot Lead Alert to Tim · HIGH
When a prospect meets the qualification threshold from email responses, Tim receives an immediate alert.

**Acceptance criteria:**
- Alert sent via email AND SMS within 5 minutes of signal threshold being met
- Alert includes: company name, contact name, phone, lead score, signal summary
- One-click link to CRM record included in alert
- ⚠️ Alert threshold criteria — confirm with Tim before going live

---

## REQ-08 · Warm Handoff Briefing · HIGH
Tim receives a structured briefing before each sales call:
- Company name, contact, title, phone
- Lead score and per-criterion breakdown
- Qualification signals from email responses
- Enrichment notes (industry, revenue, buying history)
- Suggested talking points (AI-generated)

**Acceptance criteria:**
- Briefing auto-generated and attached to CRM record and alert
- Talking points are suggestions only — Tim edits freely

---

## REQ-09 · Sales Process Stage Tracking · HIGH
CRM must track each stage of the full sales process:

`Qualified → Discovery Call → Needs Analysis → Sample Box Sent → Quote → First Order → Long-term Relationship`

**Acceptance criteria:**
- Stage transitions logged with date
- Tim can update stage manually from CRM or mobile
- Stage data feeds REQ-11 reporting

---

## REQ-10 · Nurture Sequence · MEDIUM
Leads below the score threshold or who do not respond to the email sequence enter an automated nurture track.

**Acceptance criteria:**
- Nurture leads re-scored monthly using updated enrichment data
- If score increases above threshold, they re-enter the main pipeline
- Nurture sequence is distinct from the main 3-email sequence (no duplicate sends)

---

## REQ-11 · Reporting Dashboard · MEDIUM
Monthly summary report covering:

| Metric | Source |
|--------|--------|
| Emails sent | Instantly.ai |
| Open rate / reply rate | Instantly.ai |
| Leads qualified | Scoring engine |
| Hot lead alerts triggered | Make.com |
| Sample boxes sent | CRM stage tracking |
| Cost per qualified lead | Manual input / calc |

**Acceptance criteria:**
- Report generated automatically at end of each calendar month
- Delivered to Greg and Tim via email
- Exportable to Excel for further analysis
