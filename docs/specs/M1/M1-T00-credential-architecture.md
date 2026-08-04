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

---

## Decision (resolved 2026-08-04) — D-21

**Approach chosen: Cloudflare Workers**, reviewed and approved by Drew.

**Options considered:**
- **Cloudflare Workers (chosen).** Free tier (100,000 req/day — far beyond a single-user app's
  volume, so $0 recurring cost). No change to the existing GitHub Pages deploy (D-17) — the
  Worker is a small, independently-deployed piece of infra the static site calls out to. New
  vendor dependency: a free Cloudflare account.
- **Netlify Functions.** Would consolidate hosting + API on one platform, but means either
  splitting the app across two hosts or revisiting D-17 (GitHub Pages) entirely. Rejected to
  avoid disturbing an already-made decision for no functional gain.
- **AWS Lambda + API Gateway.** More scalable/enterprise-grade, but heavier setup (IAM, API
  Gateway config) than a single-user, low-traffic proxy needs. Rejected as overkill.
- **Supabase Edge Functions.** Drags in a full backend platform (DB, auth) to do a job that's
  just "hold two secrets." Rejected as unnecessary vendor surface area.

**Endpoint design: purpose-built, not a generic reverse proxy.** The Worker exposes exactly two
narrow endpoints rather than blindly forwarding arbitrary requests with the key attached. A
generic pass-through proxy would mean a leaked Worker URL grants arbitrary LACRM/Anthropic API
access; purpose-built endpoints limit the blast radius to exactly what the app does.

**What was built:**
- `worker/` — a Cloudflare Worker (TypeScript) with:
  - `POST /api/anthropic/chat` — `{ prompt }` → `{ text }`, forwards to Anthropic with
    `ANTHROPIC_API_KEY` attached server-side.
  - `GET /api/lacrm/ping` — calls LACRM's `GetUserInfo` function with `LACRM_USER_CODE` +
    `LACRM_API_TOKEN` attached server-side; proves the credential mechanism works end-to-end for
    LACRM ahead of T01's full field mapping (out of scope here, per "Out of scope" above).
  - CORS restricted to the GitHub Pages origin + local dev ports.
  - Errors from unreachable/failing upstreams return a clear JSON error (never a raw stack trace
    or silent failure) so the app can announce it via `useAnnounce()` — satisfies the
    graceful-degradation acceptance criterion.
- `src/utils/claudeApi.ts` rewritten to call the Worker instead of Anthropic directly. The
  Settings page's Anthropic API key field (the exposure flagged in M0 against T05/T11) is
  **removed** — no client-held secret exists anymore.
- `src/utils/lacrmApi.ts` + a "Test LACRM connection" button on the Settings page, calling the
  ping endpoint — a visible, testable proof the mechanism works before T01 lands.
- `.github/workflows/deploy-worker.yml` — deploys the Worker on push to `worker/**`, using a
  `CLOUDFLARE_API_TOKEN` repo secret. The app's existing Pages workflow reads a `WORKER_URL`
  repo **variable** (not secret — it's just a public URL) into `VITE_WORKER_URL` at build time.

**What still needs Drew (cannot be done by Claude Code — requires account access):** creating the
free Cloudflare account, running `wrangler login`, generating the LACRM UserCode/APIToken from
LACRM account settings, and setting the three Worker secrets + two GitHub repo values. Full
step-by-step in `worker/README.md`. Until that one-time setup is done, the AI assistant and the
new "Test LACRM connection" button will show a clear "not configured" error rather than fail
silently.
