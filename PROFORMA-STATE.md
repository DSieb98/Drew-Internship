# ProForma State — Updated: 2026-06-02

> **Read this at the start of every Claude Code session.** Update it at the end.
> It is the source of truth for what has been decided, what is in progress, and what is open.

---

## Current phase: Phase 1 — Foundation

### Phase 1 checklist
- [ ] Set up Less Annoying CRM account
- [ ] Import existing lead spreadsheet into CRM
- [ ] Configure Make.com to import and route leads from XLSX
- [ ] Define and lock lead scoring thresholds with Greg & Tim
- [ ] Create project repo and commit all spec files (no PII, no secrets)

### Phase 2 (not started)
- [ ] Connect Clay.com for enrichment
- [ ] Build and test scoring engine
- [ ] Validate CRM auto-create logic

### Phase 3 (not started)
- [ ] Write 3-email sequence in Instantly.ai
- [ ] Set up response tracking and signal capture
- [ ] Configure hot lead alert to Tim

### Phase 4 (not started)
- [ ] Go live
- [ ] 30-day review

---

## Decided
| # | Decision | Date |
|---|----------|------|
| D-01 | MVP data source = Excel spreadsheet (not Apollo/ZoomInfo yet) | A-03 |
| D-02 | CRM = Less Annoying CRM | requirements doc |
| D-03 | Email tool = Instantly.ai | requirements doc |
| D-04 | Automation = Make.com | requirements doc |
| D-05 | Enrichment = Clay.com | requirements doc |
| D-06 | Claude Code runs on Pro subscription ($20/mo flat, no API key for tooling yet) | setup doc |

---

## Open / Pending
| # | Question | Owner | Priority |
|---|----------|-------|----------|
| O-01 | Lead score threshold (37–45 suggested) | Greg & Tim | 🔴 High |
| O-02 | Minimum annual promo spend to qualify | Greg & Tim | 🔴 High |
| O-03 | Industries/job titles to prioritize or exclude | Greg & Tim | 🟡 Medium |
| O-04 | Tim approval flow: manual per box vs auto-trigger | Tim | 🔴 High |
| O-05 | 90-day success metric: volume (boxes sent) or quality (conversations)? | Greg & Tim | 🟡 Medium |
| O-06 | API key for runtime Claude calls (Phase 2+, not now) | Drew | 🟢 Low |

---

## In progress this session
_Nothing in progress — session closed._

---

## Session log
| Date | What was done |
|------|---------------|
| 2026-06-02 | Initial spec files generated from requirements doc v1.1 and Claude setup guide |
| 2026-06-02 | Ran first-time setup check; .env copied from template; confirmed all spec files present and gitignore clean; no accounts or decisions made |
