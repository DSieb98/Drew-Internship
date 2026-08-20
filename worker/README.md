# SynetheixSales API Worker (M1-T00)

A small Cloudflare Worker that holds the LACRM and Anthropic API secrets server-side so the
public GitHub Pages static site never embeds them. It exposes only the narrow endpoints the app
actually needs — see `src/index.ts` for why (purpose-built, not a generic pass-through proxy).

> **D-32 rename note:** `wrangler.toml`'s Worker name changed from `salesforge-api` to
> `synetheixsales-api` 2026-08-12. That deploys a brand-new Worker at a new URL rather than
> renaming the live one in place — production still points at the old `salesforge-api` URL until
> a human completes steps 6–7 below against the new name. The setup steps here describe the
> original one-time setup; re-run steps 5–7 (deploy, point the app at it, confirm auto-deploy
> still targets the right Worker) to finish the cutover, then delete the old Worker once confirmed.

- `POST /api/anthropic/chat` — `{ prompt: string }` → `{ text: string }`. Enforces the $20/month AI
  budget cap (D-39): returns `402` with `{ error, budgetReached: true }` once the month's tracked
  spend reaches the cap, instead of calling Anthropic.
- `GET /api/anthropic/usage` — current month's AI spend (D-39) → `{ month, costUsd, budgetUsd,
  remainingUsd, percentUsed }`, read by the Reports page's "AI Assistant Budget" section
- `POST /api/company-research/search` — `{ company, city?, state?, industry? }` →
  `{ text, citations }`. Backs the LeadCard "Research company" button (D-48): calls Exa's
  Answer API (search + synthesized summary + citations in one call). Originally built against
  Perplexity, but Perplexity has no free-tier key available — that code path
  (`handleCompanyResearchPerplexity` in `src/index.ts`) is kept but unrouted/dormant, not
  deleted, in case a Perplexity key becomes viable later. Path name is deliberately
  provider-neutral since the backing provider has already changed once. No spend cap yet
  (unlike D-39's Anthropic budget) — flagged in D-48 as a follow-up if usage grows enough to
  matter.
- `POST /api/company-research/enrich` — `{ company, city?, state?, industry? }` →
  `{ runId, status }`. Starts an employees/revenue/industry lookup via Exa's Agent API (D-49) —
  async, so this only creates the run; poll the endpoint below for the result.
- `GET /api/company-research/enrich/:runId` — `{ status }` while still running, or
  `{ status: "completed", structured: { employees, annualRevenue, industry }, citations }` /
  `{ status: "failed"|"cancelled", error }` once terminal. Display-only on the client for now
  (D-49) — nothing here writes to a Lead.
- `GET /api/lacrm/ping` — connectivity check (calls LACRM's `GetUser`) → current user info
- `GET /api/lacrm/contacts?search=` — search contacts (`GetContacts`)
- `GET /api/lacrm/contacts/:id` — get one contact (`GetContact`)
- `POST /api/lacrm/contacts` — create a contact (`CreateContact`)
- `PATCH /api/lacrm/contacts/:id` — edit a contact (`EditContact`)
- `GET /api/lacrm/pipelines` — list pipelines + their statuses (`GetPipelines`), used to resolve
  confirmed stage names to LACRM `StatusId`s (see `src/utils/lacrmMapping.ts` in the app)
- `GET /api/lacrm/pipeline-items?pipelineId=` — a pipeline's contact placements (`GetPipelineItems`)
- `POST /api/lacrm/pipeline-items` — place a contact in a pipeline (`CreatePipelineItem`)
- `PATCH /api/lacrm/pipeline-items/:id` — move a contact's stage (`EditPipelineItem`)
- `GET /api/lacrm/custom-fields` — list Contact custom fields (`GetCustomFields`), used to bootstrap
  the app's score/status-override/scoring-input fields on first run (still named with the
  `SalesForge` prefix in LACRM itself — see the note in `src/utils/lacrmMapping.ts`, D-32)
- `POST /api/lacrm/custom-fields` — create a Contact custom field (`CreateCustomField`)
- `GET /api/lacrm/notes` — list notes account-wide (`GetNotes`), used to read back call history
- `POST /api/lacrm/notes` — attach a note to a contact (`CreateNote`), used to log a call
- `POST /api/feedback` — `{ text: string }` → stores an in-app feedback/request entry (Feedback
  nav page), so Tim can type anything he thinks would help and Drew can see it later
- `GET /api/feedback` — all feedback entries, newest first → `{ entries: FeedbackEntry[] }`
- `PATCH /api/feedback/:id` — `{ status: "new" | "reviewed" }`, marks a request reviewed once
  Drew has acted on it

## One-time setup (Drew — these steps need a human with account access; Claude Code cannot do them)

1. **Create a free Cloudflare account** at https://dash.cloudflare.com/sign-up (Workers free tier:
   100,000 requests/day — far more than this app needs).
2. **Install Wrangler and log in:**
   ```bash
   cd worker
   npm install
   npx wrangler login
   ```
3. **Get your LACRM API key:** log into LACRM as whichever user's credentials should be used
   (see the "whose LACRM login" question already discussed — pull from Tim once decided), then go
   to the [Programmer API settings page](https://account.lessannoyingcrm.com/app/Settings/Api) and
   generate a key. This is a single key (LACRM's v2 API) — not the older UserCode+APIToken pair
   some third-party docs reference.
4. **Set the secrets** (never go in the repo or `wrangler.toml`):
   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler secret put LACRM_API_KEY
   npx wrangler secret put EXA_API_KEY
   ```
   The Exa key is generated at https://dashboard.exa.ai/api-keys (free tier available). Until
   this secret is set, `/api/company-research/search` (LeadCard's "Research company" button)
   fails with a 502 — the rest of the app is unaffected. `PERPLEXITY_API_KEY` does **not** need
   to be set — that code path is dormant (D-48), kept only for possible future use.
5. **Deploy once manually** to get the Worker's URL:
   ```bash
   npx wrangler deploy
   ```
   Wrangler prints the live URL, e.g. `https://synetheixsales-api.<your-subdomain>.workers.dev`.
6. **Point the app at it:**
   - Local dev: add `VITE_WORKER_URL=https://synetheixsales-api.<your-subdomain>.workers.dev` to
     the repo-root `.env`.
   - Production build: add a repository **variable** (not secret — it's just a public URL) named
     `WORKER_URL` under GitHub repo → Settings → Secrets and variables → Actions → Variables, set
     to the same URL. The Pages deploy workflow reads it at build time.
7. **Enable auto-deploy for the Worker on push:** add a repository **secret** named
   `CLOUDFLARE_API_TOKEN` (create at Cloudflare dashboard → My Profile → API Tokens → "Edit
   Cloudflare Workers" template) so `.github/workflows/deploy-worker.yml` can deploy on every push
   to `worker/**`.

After that, redeploying the Worker only needs a normal `git push` — CI handles it. Rotating a
secret (e.g. a new Anthropic key) needs `wrangler secret put` again; it does not require a code
change or redeploy of the static site.

### AI cost budget setup (D-39 — one more one-time step, Drew)

The $20/month AI budget cap needs a Workers KV namespace to track spend in (Cloudflare's
free tier covers this app's traffic easily — 1,000 writes/day, 100,000 reads/day). Create it
once and paste the id into `wrangler.toml`:

```bash
cd worker
npx wrangler kv namespace create AI_COST_KV
```

Wrangler prints an `id = "..."` line — replace `REPLACE_WITH_KV_NAMESPACE_ID` in
`wrangler.toml`'s `[[kv_namespaces]]` block with that value, then redeploy (`git push`, same
as any other Worker change). Until this is done, `/api/anthropic/chat` and `/api/anthropic/usage`
will fail (no bound KV namespace) — the rest of the app is unaffected.

### Feedback page setup (one more one-time step, Drew)

The Feedback nav page (Tim types anything he thinks would help; you see it and update the app)
needs its own KV namespace, same reasoning as AI_COST_KV above:

```bash
cd worker
npx wrangler kv namespace create FEEDBACK_KV
```

Wrangler prints an `id = "..."` line — replace the second `REPLACE_WITH_KV_NAMESPACE_ID` in
`wrangler.toml` (the `FEEDBACK_KV` binding) with that value, then redeploy. Until this is done,
`/api/feedback` will fail (no bound KV namespace) — the rest of the app is unaffected.

## Local development

```bash
cd worker
cp .dev.vars.example .dev.vars   # fill in real values, this file is gitignored
npm run dev                       # wrangler dev, serves on http://localhost:8787
```

Then set `VITE_WORKER_URL=http://localhost:8787` in the repo-root `.env` while developing.

## Why this exists

See `docs/specs/M1/M1-T00-credential-architecture.md` for the full decision writeup (approach
considered, tradeoffs, why Cloudflare Workers) and `CLAUDE.md` decision D-21.
