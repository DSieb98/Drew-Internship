# M1-T00 — Credential architecture decision + implementation

**Goal:** Decide and implement how a browser-only, publicly-hosted static site (GitHub Pages, no server) can hold and use credentials for the LACRM API and the Anthropic API without exposing raw secrets client-side, so T01 onward have a real mechanism to build against.

**Depends on:** —

> **Note:** this is Open Blocker 2 in PROFORMA-STATE-v8.md. It's listed as a task here — not just a decision — because someone (Drew, with Claude Code's input) has to actually pick and build an approach; the M1 store swap (T02) can't be built without it.

## In scope

- Evaluate viable approaches for a static/browser-only site needing to call an authenticated third-party API (e.g., a lightweight serverless proxy/token-exchange endpoint, a backend-for-frontend, scoped/short-lived tokens) and document the tradeoffs.
- Implement the chosen approach for both LACRM calls and Anthropic API calls (the Anthropic key exposure was already flagged in M0 against T05/T11).
- Document the decision and mechanism clearly enough that a future session doesn't have to re-derive it.

## Out of scope

- The actual LACRM data mapping (T01) or store swap (T02) — this task only makes secure calls possible.

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- No raw API secret may be embedded in client-side code or committed to the repo.
- Whatever is added (a hosted function, a proxy service, etc.) must itself be commercially/free-tier viable and licensed appropriately (PRINCIPLE-02) — flag any new recurring cost or new vendor dependency to Drew explicitly, since this introduces the first exception to the project's "browser-only, no server" posture.

## Acceptance criteria

- A documented decision exists (approach + why) that Drew has reviewed.
- LACRM and Anthropic calls work end-to-end through the new mechanism with no secret visible in browser dev tools, page source, or the public repo.
- The mechanism degrades gracefully (clear, announced error) if the credential/proxy is unreachable.

## How — Claude Code decides

The specific proxy/hosting technology and its implementation are Claude Code's call, within the constraint that no secret is exposed client-side and the project stays commercially clean. Flag the tradeoffs to Drew before committing to one, since this is a genuine architecture decision, not a routine build task.

## References

- PROFORMA-STATE-v8.md: Open Blocker 2
- Spec v1.2: PRINCIPLE-02 (licensing), §7 Technology Stack ("browser-only... no server required" — this task introduces the first exception and should be flagged as such)
