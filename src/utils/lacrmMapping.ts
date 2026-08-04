/**
 * SalesForge Lead ↔ LACRM field mapping (M1-T01).
 * Full category-by-category decision writeup: docs/specs/M1/M1-T01-lacrm-client-mapping.md.
 *
 * This module covers what T01 owns: Contact field mapping and pipeline
 * stage-name reconciliation. Nurture state, scores, hot-alert status, call
 * history, and notes are *documented* here (as constants/comments) but their
 * sync logic is T04's job — T01 only proves the credential + client
 * mechanism and defines where each category will live in LACRM.
 */

import type { Lead } from '../store/types'
import type { LacrmContact, LacrmContactInput, LacrmPipeline } from './lacrmApi'

// ── Lead ↔ Contact ───────────────────────────────────────────────────────

export function leadToLacrmContactInput(lead: Lead): LacrmContactInput {
  const input: LacrmContactInput = {
    IsCompany: false,
    Name: lead.contactName || lead.company || 'Unknown',
  }
  if (lead.company) input['Company Name'] = lead.company
  if (lead.jobTitle) input['Job Title'] = lead.jobTitle
  if (lead.email) input.Email = [{ Text: lead.email, Type: 'Work' }]
  if (lead.phone) input.Phone = [{ Text: lead.phone, Type: 'Work' }]
  if (lead.city || lead.state) {
    input.Address = [{ City: lead.city || undefined, State: lead.state || undefined, Type: 'Work' }]
  }
  return input
}

export function lacrmContactToLeadPatch(contact: LacrmContact): Partial<Lead> {
  const patch: Partial<Lead> = {
    contactName: [contact.Name.FirstName, contact.Name.LastName].filter(Boolean).join(' '),
    company: contact['Company Name'] ?? '',
    jobTitle: contact['Job Title'] ?? null,
    email: contact.Email?.[0]?.Text ?? '',
    phone: contact.Phone?.[0]?.Text ?? '',
  }
  const address = contact.Address?.[0]
  if (address) {
    patch.city = address.City ?? ''
    patch.state = address.State ?? ''
  }
  return patch
}

// ── Pipeline stage reconciliation (B-01) ────────────────────────────────
//
// Confirmed LACRM stages (Drew, 2026-08-04): Discovery Call, Needs Analysis,
// Sample Box Sent, Quote, First Order, Long-term Relationship — plus
// "Qualified" as the REQ-09 entry stage. Going forward, Lead.stage should
// just hold one of these canonical names directly (no translation needed,
// since app vocabulary === LACRM vocabulary once T03 lands). This table only
// exists to migrate *pre-existing* leads still carrying the old placeholder
// vocabulary the first time they're synced.
//
// Ambiguities resolved here explicitly (not guessed) — flag to Drew if wrong:
//   - New Lead / Contacted → no LACRM stage. These are pre-qualification,
//     SalesForge-only states (REQ-04 only creates the CRM record at
//     "Qualified"). Mapped to `null`: sync the Contact record itself
//     (PRINCIPLE-01 still wants it durable), but don't place it in the
//     pipeline yet.
//   - Proposal Sent / Quote Requested → both collapse into "Quote". LACRM's
//     confirmed list has one "Quote" stage, not two.
//   - Follow-Up → "Needs Analysis" (closest fit: ongoing engagement before a
//     firm next step).
//   - Sample Sent → "Sample Box Sent" (naming difference only).
export const LEGACY_STAGE_MIGRATION: Record<string, string | null> = {
  'New Lead': null,
  'Contacted': null,
  'Qualified': 'Qualified',
  'Proposal Sent': 'Quote',
  'Quote Requested': 'Quote',
  'Follow-Up': 'Needs Analysis',
  'Sample Sent': 'Sample Box Sent',
}

/** Migrates a possibly-legacy stage string to the canonical LACRM stage name (or null = no pipeline placement yet). */
export function canonicalStageName(stage: string): string | null {
  if (stage in LEGACY_STAGE_MIGRATION) return LEGACY_STAGE_MIGRATION[stage]
  return stage || null
}

/** Resolves a canonical stage name to a live LACRM StatusId, by exact case-insensitive name match against the given pipeline. Returns null if the pipeline has no matching status (e.g. "Qualified" may not exist as a real LACRM status — T03 must handle that case rather than assume it always resolves). */
export function resolveStageStatusId(stageName: string | null, pipeline: LacrmPipeline): string | null {
  if (!stageName) return null
  const match = pipeline.Statuses.find(s => s.Name.toLowerCase() === stageName.toLowerCase())
  return match?.StatusId ?? null
}

// ── Deferred categories (documented target, not yet wired — T04) ───────
//
// - Score, statusOverride, employees/annualRevenue/industry inputs → LACRM
//   Contact-level Custom Fields, created via CreateCustomField if absent:
//   "SalesForge Score" (Number), "SalesForge Status Override" (Dropdown:
//   Hot/Warm/Cold), "SalesForge Employees" (Number), "SalesForge Annual
//   Revenue" (Currency), "SalesForge Industry" (Text).
// - Hot-alert status → a "SalesForge Hot Alert" Checkbox custom field.
// - Nurture step (M2) → a "SalesForge Nurture Step" Number custom field.
// - Call history (CallLog[]) → one LACRM Note per call log entry
//   (CreateNote with ContactId + a formatted Note body: date, duration,
//   outcome, notes), read back via GetNotesAttachedToContact.
// - pinned / pinnedNote (Watchlist) → explicitly NOT decided here; owned by
//   M1-T06 (open blocker 4 — LACRM-synced vs. device-local scratchpad).
