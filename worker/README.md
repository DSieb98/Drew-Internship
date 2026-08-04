# SalesForge API Worker (M1-T00)

A small Cloudflare Worker that holds the LACRM and Anthropic API secrets server-side so the
public GitHub Pages static site never embeds them. It exposes exactly two endpoints — see
`src/index.ts` for why (purpose-built, not a generic pass-through proxy).

- `POST /api/anthropic/chat` — `{ prompt: string }` → `{ text: string }`
- `GET /api/lacrm/ping` — connectivity check → `{ ok: boolean }`

## One-time setup (Drew — these steps need a human with account access; Claude Code cannot do them)

1. **Create a free Cloudflare account** at https://dash.cloudflare.com/sign-up (Workers free tier:
   100,000 requests/day — far more than this app needs).
2. **Install Wrangler and log in:**
   ```bash
   cd worker
   npm install
   npx wrangler login
   ```
3. **Get your LACRM credentials:** LACRM account → Settings → API Access. You need your
   `UserCode` and `APIToken` (separate values, not the OAuth app flow).
4. **Set the three secrets** (never go in the repo or `wrangler.toml`):
   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler secret put LACRM_USER_CODE
   npx wrangler secret put LACRM_API_TOKEN
   ```
5. **Deploy once manually** to get the Worker's URL:
   ```bash
   npx wrangler deploy
   ```
   Wrangler prints the live URL, e.g. `https://salesforge-api.<your-subdomain>.workers.dev`.
6. **Point the app at it:**
   - Local dev: add `VITE_WORKER_URL=https://salesforge-api.<your-subdomain>.workers.dev` to the
     repo-root `.env`.
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
