# M0-T04 — Today & All Leads views (REQ-07 UI, TZ-01)

**Goal:** Give Tim his daily working surfaces — a prioritized "Today" view that tells him who to
call and an "All Leads" list he can filter — with the dashboard hot-lead alert and local-time
cues.

**Depends on:** T01, T02 (leads to show), T03 (scores/status).

## In scope

- **Today view:** the day's priorities — the most important lead surfaced prominently, the leads to
  call today, the ones needing follow-up, and a recent-activity summary.
- **All Leads view:** the full list with filters (e.g., everyone / call-today / follow-up / gone-
  quiet).
- **Lead cards:** a consistent card used across views showing company, contact, status, stage,
  location, deal-value label, and a "gone quiet" cue when a lead has been silent past the
  threshold.
- **REQ-07 hot-lead alert (UI):** a dashboard alert driven by the highest-value qualifying Hot lead,
  using the configurable hot-alert deal-value threshold from Settings. Dashboard display only — no
  push (B-05).
- **TZ-01:** show each lead's timezone abbreviation and current local time, with a visual+text cue
  when it's outside good calling hours (roughly 8am–6pm local). Static, no external API.

## Out of scope

- The full lead detail (T05 drawer), the map (T06), pinning (T07), call logging (T08).

## Constraints

- Project-wide constraints (`../00-development-plan.md` §3).
- Accessibility: lead lists use list semantics with item counts; status, deal value, "gone quiet,"
  and bad-calling-hour cues are conveyed in text, not color/icon alone; the alert is announced
  appropriately without hijacking focus.
- The "most important lead" is computed (highest-value qualifying Hot lead), never hardcoded.

## Acceptance criteria

- Today surfaces the correct top lead and the correct call/follow-up groupings from real data.
- Filters on All Leads return the right subsets and the result count is announced.
- The hot alert reflects the Settings threshold and updates when it changes.
- Local time and bad-hour cues read correctly to JAWS for leads in different timezones.

## How — Claude Code decides

Layout, card composition, filter mechanism, and how local time is derived are yours, within the
constraints.

## References

- Spec v1.2: REQ-07, TZ-01, B-05, DV-01 (deal-value label)
- Prototype: Today page, All Leads page, `LeadCard`, `LocalTimeBadge`, `alertLeads`/`topLead`
  (reference only)
- App shell and nav pattern: T01 — section nav uses `<nav>` + `aria-current="page"` links,
  not an ARIA tablist. T04 page content mounts inside the T01 shell.
