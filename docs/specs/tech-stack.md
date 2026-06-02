# ProForma Tech Stack

> ⚠️ All tools and costs are initial recommendations — not validated. Confirm pricing and integration compatibility with each vendor before committing. See Assumption A-02 in the requirements doc.

**Estimated monthly operating cost: $50–75**

---

## Tool registry

| Function | Tool | Tier/Plan | Est. Monthly Cost | Status |
|----------|------|-----------|-------------------|--------|
| Lead source (MVP) | Excel/XLSX spreadsheet | — | $0 | ✅ Confirmed |
| Lead source (Phase 2+) | Apollo.io | Basic or Pro | ~$49–$99 | 🔲 Pending |
| Lead source (Phase 2+) | ZoomInfo | Enterprise | ~custom | 🔲 Pending |
| Lead source (Phase 2+) | LinkedIn Sales Nav | Core | ~$99 | 🔲 Pending |
| AI enrichment | Clay.com | Starter | ~$149 | 🔲 Pending |
| CRM | Less Annoying CRM | Per user | ~$15/user | 🔲 Pending |
| Email sequencing | Instantly.ai | Growth | ~$37–$97 | 🔲 Pending |
| Workflow automation | Make.com | Core | ~$10–$29 | 🔲 Pending |
| Reporting | Less Annoying CRM + Make.com | (bundled above) | $0 additional | 🔲 Pending |

---

## Integration map

```
Excel/XLSX
    │
    ▼
Make.com ──────────────────────────────────────────┐
    │ (import trigger)                              │
    ▼                                              │
Clay.com                                           │
    │ (enrichment + scoring)                        │
    ▼                                              │
Less Annoying CRM                                  │
    │ (auto-create record)                          │
    ▼                                              │
Instantly.ai                                       │
    │ (3-email sequence)                            │
    ▼                                              │
Make.com ◄─────────────────────────────────────────┘
    │ (response capture + signal parsing)
    ▼
Hot Lead Alert → Tim (email + SMS)
    │
    ▼
Tim Sales Call → CRM Stage Update
```

---

## Tool setup order (Phase 1)

1. **Less Annoying CRM** — create account, set up pipeline stages (see REQ-09)
2. **Make.com** — create workspace, connect to CRM, build XLSX import scenario
3. **Instantly.ai** — create account, connect sending domain, warm up mailbox (allow 2 weeks)
4. **Clay.com** — create account, connect to Make.com (Phase 2)

> Mailbox warmup for Instantly.ai takes ~2 weeks — start this early.

---

## API keys & secrets

Store all secrets in `.env` (gitignored). Never paste into chat. Never commit.

```bash
# .env — copy from .env.example and fill in
LESS_ANNOYING_CRM_API_KEY=
INSTANTLY_API_KEY=
CLAY_API_KEY=
MAKE_WEBHOOK_SECRET=
SCORE_THRESHOLD=0        # set to agreed value after Greg & Tim review
TIM_ALERT_EMAIL=
TIM_ALERT_PHONE=
```

---

## Claude Code / AI tooling

Per the setup guide:
- **Claude Pro subscription** ($20/mo flat) for Drew's day-to-day Claude Code + chat
- **No API key for automated pipeline yet** — Phase 2+ decision
- If/when a runtime API key is needed: cap at $25/key, $50/org limit, 80% notification threshold, one key per service
- Use **Sonnet** by default; **Opus** only for genuinely hard problems
