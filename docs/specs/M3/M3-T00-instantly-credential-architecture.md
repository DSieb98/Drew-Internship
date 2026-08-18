# M3-T00 — Instantly.ai account & credential architecture

**Goal:** Get Instantly.ai account access in place and resolve how SalesWhiz (a static, browser-only GitHub Pages site) can trigger authenticated Instantly.ai API calls — sending sequences, receiving reply data — without exposing API secrets client-side.

**Depends on:** M1-T00 (credential architecture spike) — this task should reuse whatever pattern that spike lands on, not invent a second one for a second API.

**Owner:** Drew.

## In scope

- Instantly.ai account/workspace confirmation and API access.
- Applying M1-T00's resolved credential architecture (proxy, serverless function, or whatever pattern it settles on) to Instantly.ai's API specifically — same class of problem as LACRM sync and the Anthropic API calls already flagged as blocked on this.
- If M1-T00 isn't resolved yet: this task is blocked on it, full stop — do not build a separate one-off credential workaround just for Instantly.ai. A second, inconsistent pattern here would undermine the point of solving it once in M1.

## Out of scope

- The actual send/capture integration logic (T01, T02).
- Re-deciding the credential architecture itself if M1-T00 has already resolved it — this task applies that decision, doesn't re-litigate it.

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- PRINCIPLE-02: Instantly.ai must be commercially licensed appropriately (D-03 already approved the tool choice; this task covers actually provisioning it).
- No API keys or secrets committed to the repo or exposed in client-side bundle code, regardless of which credential pattern M1-T00 settled on.

## Acceptance criteria

- Instantly.ai account is active with API access confirmed working (a single test call succeeds).
- The credential-handling pattern is the same one used for LACRM (M1) — not a bespoke second approach.
- No secrets are visible in the deployed static site's client bundle.

## How — Claude Code decides

Not applicable if M1-T00's pattern is a Drew-owned account/infra decision. If the resolved pattern requires SalesWhiz-side code changes (e.g. calling a proxy endpoint), that implementation detail is Claude Code's call within M1-T00's already-decided architecture.

## References

- Spec v1.2: REQ-05, D-03
- M1-T00-credential-architecture-spike.md (hard dependency)
