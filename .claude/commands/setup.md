# /project:setup — ProForma Environment Setup

Run this command at the start of a new machine or fresh clone to verify the environment is correctly configured before any real work begins.

---

## What this command does

1. Checks Node.js version (requires 18+)
2. Verifies Claude Code is authenticated
3. Checks `.env` exists and required keys are non-empty
4. Confirms `data/` directory exists and is gitignored
5. Validates project file structure
6. Prints a summary of open decisions from `PROFORMA-STATE.md`
7. Recommends the next action based on current phase

---

## Instructions for Claude Code

When the user runs `/project:setup`, execute the following steps in order. Report pass ✅ / fail ❌ / warning ⚠️ for each.

### Step 1 — Node.js version
```bash
node --version
```
- Pass if version is 18.x or higher
- Fail if missing or below 18 — instruct user to install via nvm: `nvm install 20`

### Step 2 — Claude Code auth check
```bash
claude --version
```
- Pass if command returns a version string
- If not found, instruct: install via `npm install -g @anthropic-ai/claude-code` (requires Node 18+) or native installer at code.claude.com/docs

### Step 3 — .env file check
```bash
test -f .env && echo "found" || echo "missing"
```
- If missing: `cp .env.example .env` and warn user to fill in values before proceeding
- If found: check that these keys are non-empty (do NOT print values):
  - `LESS_ANNOYING_CRM_API_KEY`
  - `INSTANTLY_API_KEY`
  - `SCORE_THRESHOLD`
  - `TIM_ALERT_EMAIL`
  - Warn (not fail) for `CLAY_API_KEY` and `MAKE_WEBHOOK_SECRET` — needed for Phase 2

### Step 4 — PII safety check
```bash
git check-ignore data/ && echo "gitignored" || echo "NOT GITIGNORED — fix immediately"
git check-ignore .env && echo "gitignored" || echo "NOT GITIGNORED — fix immediately"
```
- Both must be gitignored. If either is not, stop and fix `.gitignore` before any other work.

### Step 5 — Project file structure
Check that these files exist:
- `CLAUDE.md`
- `PROFORMA-STATE.md`
- `README.md`
- `.env.example`
- `.gitignore`
- `docs/specs/requirements.md`
- `docs/specs/lead-scoring.md`
- `docs/specs/email-sequence.md`
- `docs/specs/tech-stack.md`

Warn for any missing file; suggest running the spec generator if multiple are missing.

### Step 6 — Open decisions summary
Read `PROFORMA-STATE.md` and print all items from the **Open / Pending** table. Format as:

```
⚠️  Open decisions requiring input before build can proceed:
  O-01  Lead score threshold (37–45 suggested) — Owner: Greg & Tim
  O-02  Minimum annual promo spend to qualify   — Owner: Greg & Tim
  O-04  Tim approval flow (manual vs auto)      — Owner: Tim
  ...
```

Highlight any 🔴 High priority items.

### Step 7 — Current phase and next action
Read current phase from `PROFORMA-STATE.md` and print:

```
📍 Current phase: Phase 1 — Foundation

✅ Next action:
   [Print the first unchecked item from the Phase 1 checklist]

💡 Recommended model for this session: Sonnet (switch to Opus only for hard problems)
```

### Step 8 — Spending reminder (if API key present)
If `ANTHROPIC_API_KEY` is non-empty in `.env`:
```
⚠️  ANTHROPIC_API_KEY is set. Runtime API billing is active.
    Reminder: cap is set at console.anthropic.com → Limits.
    Use Claude Pro (flat $20/mo) for Claude Code — API key is for pipeline automation only.
```

---

## Output format

```
════════════════════════════════════════
  ProForma Setup Check — 2026-06-02
════════════════════════════════════════

✅  Node.js 20.x — ok
✅  Claude Code authenticated
⚠️  .env found — CLAY_API_KEY empty (needed for Phase 2)
✅  data/ gitignored
✅  .env gitignored
✅  All spec files present

⚠️  Open decisions (3 high-priority):
    O-01  Score threshold — Greg & Tim
    O-02  Min promo spend — Greg & Tim
    O-04  Tim approval flow — Tim

📍  Phase 1 — Foundation
    Next: Set up Less Annoying CRM account

════════════════════════════════════════
Ready. Use Sonnet for this session.
════════════════════════════════════════
```

---

## Usage

```
/project:setup
```

No arguments needed. Run at the start of any new session on a fresh machine or after any significant gap between sessions.
