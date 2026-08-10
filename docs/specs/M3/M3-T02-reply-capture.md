# M3-T02 — Reply / response capture

**Goal:** Capture buyer signals from email replies to sequences sent via T01 — role, purchase history, upcoming events, sample box interest — per REQ-06's approved scope.

**Depends on:** T00, T01 (nothing to capture replies to until sends are live).

**Owner:** Drew (Instantly.ai webhook/reply-parsing configuration) + Claude Code (consuming and surfacing the captured data in SalesForge).

## In scope

- Configuring Instantly.ai to surface reply data (webhook or polling — Drew's call on which Instantly.ai supports/prefers) for sequences sent under T01.
- Parsing replies for the four specified buyer signals: role, purchase history, upcoming events, sample box interest. Exact parsing method (keyword rules, AI-assisted extraction via the existing Anthropic API integration, or Instantly.ai's own native reply classification if it has one) is an open implementation question — flag which approach is chosen and why, since REQ-06 doesn't mandate a specific method.
- Surfacing captured signals somewhere Tim can see them — most naturally the lead drawer's existing Info tab, alongside notes.

## Out of scope

- Sending the original sequence (T01).
- Writing captured signals to LACRM as the durable record (T03) — this task extracts and surfaces the data; T03 makes it durable.

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- If AI-assisted extraction is used, it's subject to the same PII-scope discipline as other Anthropic API calls in this project (Spec v1.2 §1a) — only what's needed for the extraction task, nothing broader sent to the API.
- A reply that doesn't clearly map to any of the four signals should not be force-fit into one — leave it unparsed/flagged for Tim to read manually rather than guessing.

## Acceptance criteria

- A test reply to a sent sequence results in at least one correctly identified buyer signal, verifiable against the actual reply content.
- Signals appear in the lead drawer, JAWS-accessible per PRINCIPLE-03.
- A reply that doesn't match any of the four signal types is still visible to Tim (not dropped), just not mis-categorized.

## How — Claude Code decides

The specific extraction approach (keyword rules vs. AI-assisted vs. Instantly.ai native) and where exactly in the lead drawer signals are surfaced are Claude Code's call within the constraints above — but the choice and its tradeoffs should be documented, not silently picked.

## References

- Spec v1.2: REQ-06 (approved scope), §1a (PII scope)
- M3-T00, M3-T01 (dependencies)
