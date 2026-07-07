# M4 — Outreach & Alerts (mostly deferred)

**Goal:** Placeholder milestone. Its original core — Instantly.ai automated email send and reply
capture — is deferred indefinitely. Retained to preserve the agreed milestone order and to hold
any future outreach work.

**Open decision (Drew):** drop this milestone entirely, or keep it as a parking spot? Do not hand
this to Claude Code until that's settled.

---

## What changed

The original M4 was REQ-05 (Instantly.ai send), REQ-06 (response capture), and REQ-07 (push
alerts). After the v1.2 spec:

- **REQ-05 automated send — deferred indefinitely.** Instantly.ai is no longer on the roadmap. The
  AI email *draft* tab (draft + copy/mailto, no automated send) already exists and is carried in
  **M0** — it does not need its own milestone.
- **REQ-06 qualification response capture — deferred indefinitely** (depended on Instantly).
- **REQ-07 push email/SMS alerts — remains deferred** (B-05: Tim confirmed the dashboard alert is
  sufficient; no push needed). The dashboard alert UI is delivered in M0.

## If kept as a parking spot

Nothing is built here now. This file exists so that, if outreach automation is ever revived (a
different email tool, push alerts, or reply capture), the work has a defined home that slots into
the existing sequence after M3. Any revival would get its own scoped requirement and would inherit
all project-wide constraints (`00-development-plan.md` §3), especially PRINCIPLE-01 and the PII
rules in spec §1a.

## References

- Spec v1.2: REQ-05, REQ-06, REQ-07, B-04, B-05
- Master plan §4 (Instantly deferral), open question 2
