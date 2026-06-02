# ProForma Lead Scoring Model
**Max score: 100 points**
**Threshold: ⚠️ TBD with Greg & Tim — suggested starting range: 37–45**

---

## Scoring criteria

| ID | Criterion | Points | How to evaluate |
|----|-----------|--------|-----------------|
| S-01 | USA Based | +7 | Country field from enrichment = "US" or "USA" |
| S-02 | 250+ Employees | +11 | Employee count ≥ 250 from enrichment |
| S-03 | Revenue $25M+ | +11 | Revenue estimate ≥ $25M from enrichment |
| S-04 | Has Marketing Department | +7 | Enrichment confirms marketing function exists (job titles, org data) |
| S-05 | Has Events | +11 | Enrichment or response signals indicate trade shows, company events, or annual programs |
| S-06 | Ordered Promo Products Before | +15 | Enrichment or response confirms prior purchase of branded merchandise |
| S-07 | Orders Multiple Times/Year | +15 | Enrichment or response indicates recurring/repeat orders (2+ per year) |
| S-08 | Immediate Need | +23 | Response or enrichment signals a near-term buying trigger (upcoming event, new hires, rebranding) |

**Total possible: 100 points**

---

## Threshold guidance

| Score range | Interpretation | Action |
|-------------|----------------|--------|
| 0–36 | Not qualified | Nurture track (REQ-10) |
| 37–45 | Borderline (TBD) | ⚠️ Threshold decision pending — hold |
| 46–69 | Qualified | Main pipeline → CRM + email sequence |
| 70–100 | High-priority | Main pipeline + flag for Tim's priority attention |

> **Do not hard-code the threshold.** Store it in `.env` as `SCORE_THRESHOLD` and default to `0` (pass-all) until Greg & Tim confirm the number.

---

## Implementation notes

- Scoring weights live in a single config object — never scattered across the codebase
- Each criterion result (pass/fail + points awarded) is stored on the lead record for auditability
- Scores are recomputed when enrichment data is refreshed (monthly nurture re-score)
- If an enrichment field is unavailable, that criterion scores 0 (conservative — don't assume)

---

## Config example (TypeScript)

```typescript
// src/config/scoring.ts
export const SCORING_CRITERIA = [
  { id: "S-01", label: "USA Based",                  points: 7  },
  { id: "S-02", label: "250+ Employees",             points: 11 },
  { id: "S-03", label: "Revenue $25M+",              points: 11 },
  { id: "S-04", label: "Has Marketing Department",   points: 7  },
  { id: "S-05", label: "Has Events",                 points: 11 },
  { id: "S-06", label: "Ordered Promo Products",     points: 15 },
  { id: "S-07", label: "Orders Multiple Times/Year", points: 15 },
  { id: "S-08", label: "Immediate Need",             points: 23 },
] as const;

export const SCORE_THRESHOLD = parseInt(process.env.SCORE_THRESHOLD ?? "0", 10);
```
