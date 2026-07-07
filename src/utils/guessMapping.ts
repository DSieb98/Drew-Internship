// Lead field keys, human-readable labels, and aliases used for auto-guessing
// spreadsheet column names during import.

export interface LeadFieldDef {
  key: string
  label: string
  required: boolean
}

export const LEAD_FIELDS: LeadFieldDef[] = [
  { key: 'company',         label: 'Company name',          required: true  },
  { key: 'contactName',     label: 'Contact name',          required: false },
  { key: 'email',           label: 'Email address',         required: false },
  { key: 'phone',           label: 'Phone number',          required: false },
  { key: 'city',            label: 'City',                  required: false },
  { key: 'state',           label: 'State',                 required: false },
  { key: 'dealValue',       label: 'Deal value ($)',        required: false },
  { key: 'stage',           label: 'Pipeline stage',        required: false },
  { key: 'employees',       label: 'Number of employees',   required: false },
  { key: 'annualRevenue',   label: 'Annual revenue ($)',    required: false },
  { key: 'industry',        label: 'Industry',              required: false },
  { key: 'jobTitle',        label: 'Job title',             required: false },
  { key: 'lastContactDate', label: 'Last contact date',     required: false },
]

// Lowercase aliases per field — first exact match wins, then substring match.
const ALIASES: Record<string, string[]> = {
  company:         ['company', 'company name', 'business', 'organization', 'org', 'account name', 'account'],
  contactName:     ['contact', 'contact name', 'full name', 'name', 'person', 'contact person'],
  email:           ['email', 'email address', 'e-mail', 'e mail'],
  phone:           ['phone', 'phone number', 'mobile', 'cell', 'telephone', 'tel', 'direct'],
  city:            ['city', 'town', 'municipality'],
  state:           ['state', 'province', 'region', 'st'],
  dealValue:       ['deal value', 'deal', 'value', 'opportunity value', 'amount', 'deal size', 'potential value'],
  stage:           ['pipeline stage', 'stage', 'pipeline', 'crm stage'],
  employees:       ['number of employees', 'employees', 'employee count', 'num employees', 'headcount', 'team size', 'size'],
  annualRevenue:   ['annual revenue', 'revenue', 'arr', 'yearly revenue', 'annual sales'],
  industry:        ['industry', 'sector', 'vertical', 'market'],
  jobTitle:        ['job title', 'title', 'position', 'role', 'job role'],
  lastContactDate: ['last contact date', 'last contact', 'last contacted', 'contact date', 'last activity', 'last touch'],
}

// Returns a mapping of lead field keys → matched spreadsheet column header (or null).
// Each spreadsheet column is claimed at most once (first match per field wins).
export function guessMapping(headers: string[]): Record<string, string | null> {
  const mapping: Record<string, string | null> = {}
  const usedHeaders = new Set<string>()

  for (const { key } of LEAD_FIELDS) {
    const aliases = ALIASES[key] ?? []
    let matched: string | null = null

    // Exact match first (faster, more reliable)
    for (const header of headers) {
      if (usedHeaders.has(header)) continue
      if (aliases.includes(header.toLowerCase().trim())) {
        matched = header
        usedHeaders.add(header)
        break
      }
    }

    // Substring match fallback
    if (!matched) {
      for (const header of headers) {
        if (usedHeaders.has(header)) continue
        const normalized = header.toLowerCase().trim()
        if (aliases.some(alias => normalized.includes(alias))) {
          matched = header
          usedHeaders.add(header)
          break
        }
      }
    }

    mapping[key] = matched
  }

  return mapping
}
