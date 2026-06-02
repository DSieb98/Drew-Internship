# ProForma Instantly.ai Email Sequence

3 emails. Each has a single job. Do not combine them.

---

## Email 1 — Introduction

**Purpose:** Open the relationship. Establish ProForma's credibility. No ask.

**Personalization required:** Company name, industry, one relevant detail from enrichment (e.g. recent event, growth signal, industry-specific proof point).

**Tone:** Warm, professional, brief. Not sales-y. No pitch in this email.

**Structure:**
1. Personalized opener (reference their company/industry specifically)
2. One sentence on what ProForma does
3. One proof point or social signal (client type, product category, outcome)
4. Soft close — signal you'll follow up

**Length:** 4–6 sentences max.

**Copy guidelines:**
- Never use "I wanted to reach out"
- Never open with "My name is..."
- First sentence must reference their world, not ours

---

## Email 2 — Qualification Questions

**Purpose:** Surface the prospect's buying context in a low-pressure, conversational way.

**Signals to capture (map to REQ-06):**
- Are they the buyer / decision-maker?
- Do they order promotional products / branded merchandise?
- Have they ordered in the last 12 months?
- Do they have upcoming events, initiatives, or programs?
- Is there an immediate or near-term need?

**Tone:** Curious, not interrogating. Frame as understanding their situation, not qualifying them.

**Structure:**
1. Brief callback to Email 1 (one sentence, no summary — just continuity)
2. 2–3 conversational questions (not a bulleted list — write them as natural prose or a short question sequence)
3. Open invitation to reply

**Length:** 5–8 sentences.

**Copy guidelines:**
- Ask no more than 3 questions in one email
- Questions should feel like genuine curiosity, not a checklist
- Give them an easy out ("Even a quick 'not the right time' is helpful")

---

## Email 3 — Sample Box Offer

**Purpose:** Present the complimentary sample box and close for the send. Set up Tim's call.

**Send condition:** Prospect has engaged with Email 1 or 2 (open + reply, or positive signal from REQ-06).

**Tone:** Generous, no-pressure, specific. The box is the offer — make it feel tangible and worth their time.

**Structure:**
1. Reference their reply or engagement (personalized callback)
2. Introduce the sample box — what it is, why it's relevant to them
3. The ask: confirm their shipping address / mailing info
4. Set expectations: "Tim will follow up with a quick call after you receive it"

**Length:** 6–9 sentences.

**Copy guidelines:**
- The box is a gift, not a sales tool (even if it is one) — write it that way
- Be specific about what's in the box if possible (customize by industry/enrichment)
- Make it easy to say yes: one clear action (reply with address)

---

## Sequence timing (configurable — defaults)

| Email | Send trigger | Default delay |
|-------|-------------|---------------|
| Email 1 | Lead enrolled in sequence | Immediately (business hours) |
| Email 2 | Email 1 sent | +3 business days |
| Email 3 | Email 2 sent + engagement signal | +4 business days |

> Timing is stored in Instantly.ai sequence config — not hard-coded. Adjust based on reply rate data in Phase 4.

---

## Qualification signal capture (maps to REQ-06)

Responses to Email 2 and 3 are parsed by Make.com + AI for these signals:

| Signal | Flag if response contains... |
|--------|------------------------------|
| `buyer_confirmed` | "I'm the one who..." / "I handle..." / "I approve..." |
| `orders_promo` | "We do order..." / "We use branded..." / "We buy..." |
| `recent_purchase` | "We just ordered..." / "Last [month/quarter]..." |
| `has_events` | "We have a [trade show / conference / event]..." |
| `immediate_need` | "We actually need..." / "We're looking for..." / "ASAP" |
| `wants_box` | "Yes, send it" / "I'd love to see..." / affirmative on address |

A lead triggering 3+ signals → hot lead alert to Tim (REQ-07).

---

## Unsubscribe & compliance

- Every email must include a plain-text unsubscribe link (Instantly.ai handles this)
- Unsubscribes sync to CRM immediately — do not email an unsubscribed contact
- Bounces are logged and contact is flagged in CRM as invalid
- CAN-SPAM compliant by default — confirm with Tim if prospects are outside the US
