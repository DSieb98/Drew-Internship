# M0-T11 — Free-form AI assistant (gap G5)

**Goal:** Let Tim ask plain-English questions about his leads ("who should I call first?", "anyone
gone quiet?", "write a follow-up for Ironclad") and get a useful, plain-language answer.

**Depends on:** T01, T02 (lead data to reason over). Shares the AI-call concern with T05.

> **Note:** this assistant exists in the prototype but has no requirement of its own (gap G5 in
> `../00-development-plan.md` §6), and it raises a PII question — see constraints.

## In scope

- A free-form question box (with a few suggested starter questions) that answers in plain English,
  grounded in the user's current leads.
- A warm, jargon-free assistant persona consistent with the rest of the app.
- Clear loading and answer states.

## Out of scope

- Taking actions on the user's behalf (it answers; it doesn't mutate data).

## Constraints

- Project-wide constraints (`../00-development-plan.md` §3).
- **PII — open decision (master plan open question 3):** the prototype sends **every** lead's name,
  company, and notes to the Anthropic API in a single prompt, which is more than spec §1a's
  "minimum needed for the feature." Until Drew decides, build this so the lead context sent to the
  model can be **scoped/limited** (e.g., to the relevant subset) rather than hardwired to send the
  entire lead set — and make that boundary easy to change once Drew rules on it.
- Accessibility: the input, suggestions, loading state, and answer are all reachable and announced
  to JAWS.

## Acceptance criteria

- A typed or suggested question returns a relevant, plain-language answer grounded in real leads.
- The amount of lead data sent to the model is controllable, not hardwired to "send everything."
- The full ask-and-answer flow works with JAWS only.

## How — Claude Code decides

Prompt construction, how context is selected/scoped, and the AI call mechanism are yours, within
the constraints.

## References

- Spec v1.2: §1a (PII); gap analysis G5; master plan open question 3
- Prototype: `AskAI`, `ask()` (reference only)
