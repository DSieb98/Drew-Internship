# ProForma — Automated Lead Generation

Automated pipeline: Excel spreadsheet → enriched, scored, emailed prospects → warm leads for Tim's sales calls.

**Target:** 25–50 qualified leads/month at ~$1–3/lead (vs. current 4–6 at ~$40/lead)

---

## Quick start

```bash
# 1. Clone / open the project
cd proforma

# 2. Copy env template and fill in your keys
cp .env.example .env

# 3. Drop lead spreadsheet into data/
# (gitignored — never committed)
cp ~/your-leads.xlsx data/leads.xlsx

# 4. Launch Claude Code (requires Claude Pro subscription)
claude
```

## First session checklist
- [ ] Read `CLAUDE.md` (auto-loaded by Claude Code)
- [ ] Read `PROFORMA-STATE.md` — know what's decided vs. open
- [ ] Fill in `.env` with actual API keys
- [ ] Confirm score threshold with Greg & Tim → update `SCORE_THRESHOLD` in `.env`

## Docs
- `docs/specs/requirements.md` — full functional requirements (REQ-01 through REQ-11)
- `docs/specs/lead-scoring.md` — 8-criteria scoring model
- `docs/specs/email-sequence.md` — 3-email sequence copy guidelines
- `docs/specs/tech-stack.md` — tool registry and integration map

## Important rules
- Lead data lives in `data/` — never committed, never logged
- Secrets live in `.env` — never committed, never pasted into chat
- Update `PROFORMA-STATE.md` at the end of every session
- Score threshold is NOT hard-coded — it's `SCORE_THRESHOLD` in `.env`
