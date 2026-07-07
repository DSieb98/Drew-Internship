# M0-T05 — Lead drawer / warm handoff + AI features (REQ-08)

**Goal:** When Tim opens a lead, give him everything he needs for the call in one focused panel:
the briefing, an AI-written call opener, AI next-step tips, and an AI email draft he can copy or
send manually.

**Depends on:** T04 (opened from a lead card), T03 (score/breakdown to display).

## In scope

- A focus-trapped detail panel for a single lead with the warm-handoff briefing (REQ-08): contact
  info, deal value, company facts, the score + breakdown, and notes — plus a way for Tim to flag
  disagreement with a handoff.
- **AI call opener** ("what to say"): a short, natural opener generated for this lead, regenerable.
- **AI next-step tips** ("what to do"): a couple of plain-English suggestions for the next move,
  regenerable.
- **AI email draft** (REQ-05, draft-only): a personalized draft Tim can edit, then **copy to
  clipboard or open in his mail client via mailto** — copy/paste into another tool is explicitly
  allowed. **No automated send** (Instantly deferred indefinitely).
- Entry points for "mark as called" and "log a call" that hand off to T08.

## Out of scope

- Automated email send / reply capture (deferred indefinitely).
- Call-log storage and the History view (T08) — this task only launches those flows.

## Constraints

- Project-wide constraints (`../00-development-plan.md` §3).
- **PII (spec §1a):** AI features here send only the minimum lead data needed for the specific
  draft/opener/tip — not the whole lead set.
- Accessibility: the panel is a proper focus-trapped dialog with a labeled title; its tabs are
  arrow-key operable; AI "generating…" and result states are announced; the close control uses a
  plain-text label.

## Acceptance criteria

- Opening a lead shows an accurate briefing including the live score/breakdown.
- The AI opener, tips, and email draft generate for the open lead and can be regenerated.
- The email draft can be edited and then copied or opened via mailto; no automated send exists.
- The whole panel is operable end-to-end with JAWS only.

## How — Claude Code decides

Panel layout, tab structure, prompt construction, and the AI call mechanism are yours, within the
constraints. (The prototype calls the Anthropic API directly from the client with a small `ask()`
helper — reference only.)

## References

- Spec v1.2: REQ-08, REQ-05 (draft tab / "what's built"), §1a (PII), B-04
- Prototype: `LeadDrawer` and its tabs (reference only)
