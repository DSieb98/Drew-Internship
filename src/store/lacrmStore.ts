/**
 * M1-T02 — LACRM-backed AppStore implementation.
 *
 * Fulfils the same async AppStore contract as M0's useInMemoryStore, so no
 * consuming component changes. Leads read-through from LACRM on mount and
 * write-through on create/edit for the fields T01 has mapped so far
 * (contact/company/email/phone/city/state/job title — see lacrmMapping.ts).
 *
 * Fields not yet given a LACRM home — stage, dealValue, score, pinned state,
 * call history, settings — stay in local component state for this session,
 * same as M0. That's not an oversight: T01's mapping doc explicitly defers
 * those categories (custom fields + notes) to T04 "extended-state sync".
 * This task only delivers the swapped store shell + contract (see
 * docs/specs/M1/M1-T02-async-store-swap.md "Out of scope").
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  AppStore,
  CallLog,
  Lead,
  Settings,
  StoreError,
  StoreLoading,
  TOP_TIER_MAX,
} from './types'
import { scoreLead, deriveStatus } from '../scoring/scoreLead'
import { useAnnounce } from '../hooks/useAnnounce'
import {
  searchLacrmContacts,
  createLacrmContact,
  updateLacrmContact,
  LacrmContact,
} from '../utils/lacrmApi'
import { leadToLacrmContactInput, lacrmContactToLeadPatch } from '../utils/lacrmMapping'

const DEFAULT_SETTINGS: Settings = {
  hotScoreThreshold: 75,
  warmScoreThreshold: 50,
  scoreQualificationThreshold: 0,
  hotAlertMinDealValue: 10_000,
  dealHighThreshold: 25_000,
  dealMediumThreshold: 10_000,
  employeeTiers: [
    { min: 0,    max: 49,           points: 0  },
    { min: 50,   max: 249,          points: 4  },
    { min: 250,  max: 999,          points: 8  },
    { min: 1000, max: TOP_TIER_MAX, points: 11 },
  ],
  revenueTiers: [
    { min: 0,           max: 4_999_999,    points: 0  },
    { min: 5_000_000,   max: 24_999_999,   points: 4  },
    { min: 25_000_000,  max: 99_999_999,   points: 8  },
    { min: 100_000_000, max: TOP_TIER_MAX, points: 11 },
  ],
  promoInterestPoints: 5,
  promoOneOrderPoints: 10,
  promoMultipleOrdersPoints: 15,
  nurtureSilenceDays: 14,
  recentActivityDays: 7,
}

// Fields LACRM's Contact record can currently hold (T01's mapped subset).
// A patch touching any of these needs a write-through EditContact call.
const LACRM_MAPPED_FIELDS = ['contactName', 'company', 'email', 'phone', 'city', 'state', 'jobTitle'] as const

function touchesLacrmFields(patch: Partial<Lead>): boolean {
  return LACRM_MAPPED_FIELDS.some(f => f in patch)
}

function applyScoring(lead: Lead, settings: Settings): Lead {
  const { total, breakdown } = scoreLead(lead, settings)
  const derived = deriveStatus(total, settings)
  return {
    ...lead,
    score: total,
    scoreBreakdown: breakdown,
    status: lead.statusOverride ?? derived,
  }
}

// Fills in the fields LACRM doesn't hold yet with M0-equivalent defaults —
// same shape rowToLead() uses for a freshly-imported lead.
function contactToLead(contact: LacrmContact): Lead {
  const patch = lacrmContactToLeadPatch(contact)
  return {
    id: contact.ContactId,
    company: patch.company ?? '',
    contactName: patch.contactName ?? '',
    email: patch.email ?? '',
    phone: patch.phone ?? '',
    city: patch.city ?? '',
    state: patch.state ?? '',
    timezone: '',
    dealValue: 0,
    stage: '',
    score: 0,
    scoreBreakdown: [],
    status: 'Cold',
    statusOverride: null,
    pinned: false,
    pinnedNote: '',
    called: false,
    lastContactDate: null,
    employees: null,
    annualRevenue: null,
    industry: null,
    jobTitle: patch.jobTitle ?? null,
    importedAt: new Date().toISOString(),
  }
}

// ── Reducer (mirrors inMemoryStore for the locally-owned fields) ──────────

interface State {
  leads: Lead[]
  callLogs: CallLog[]
  settings: Settings
}

type Action =
  | { type: 'HYDRATE_LEADS'; leads: Lead[] }
  | { type: 'ADD_LEAD'; lead: Lead }
  | { type: 'UPDATE_LEAD'; id: string; patch: Partial<Omit<Lead, 'id' | 'importedAt'>> }
  | { type: 'DELETE_LEAD'; id: string }
  | { type: 'ADD_CALL_LOG'; log: CallLog }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<Settings> }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE_LEADS':
      return { ...state, leads: action.leads.map(l => applyScoring(l, state.settings)) }

    case 'ADD_LEAD':
      return { ...state, leads: [...state.leads, applyScoring(action.lead, state.settings)] }

    case 'UPDATE_LEAD':
      return {
        ...state,
        leads: state.leads.map(l => {
          if (l.id !== action.id) return l
          return applyScoring({ ...l, ...action.patch }, state.settings)
        }),
      }

    case 'DELETE_LEAD':
      return { ...state, leads: state.leads.filter(l => l.id !== action.id) }

    case 'ADD_CALL_LOG':
      return { ...state, callLogs: [...state.callLogs, action.log] }

    case 'UPDATE_SETTINGS': {
      const newSettings = { ...state.settings, ...action.patch }
      return {
        ...state,
        settings: newSettings,
        leads: state.leads.map(l => applyScoring(l, newSettings)),
      }
    }
  }
}

const STATIC_LOADING: StoreLoading = { leads: false, callLogs: false, settings: false }
const STATIC_ERROR: StoreError = { leads: null, callLogs: null, settings: null }

// ── Hook ────────────────────────────────────────────────────────────────

export function useLacrmStore(): AppStore {
  const [state, dispatch] = useReducer(reducer, {
    leads: [],
    callLogs: [],
    settings: DEFAULT_SETTINGS,
  })
  const [loading, setLoading] = useState<StoreLoading>({ ...STATIC_LOADING, leads: true })
  const [error, setError] = useState<StoreError>(STATIC_ERROR)
  const announce = useAnnounce()
  const hydratedRef = useRef(false)

  // Read-through: populate leads from LACRM once on mount.
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    let cancelled = false

    async function hydrate() {
      try {
        // KNOWN GAP: searchLacrmContacts('') returns one page of GetContacts
        // (LacrmContactSearchResult.HasMoreResults exists but nothing here
        // pages through it yet). Unverified against a live account per
        // T01 — no LACRM credentials exist to confirm the real page size or
        // the pagination parameter name. Flag to Drew before relying on this
        // for an account with more contacts than one page holds.
        const contacts = await searchLacrmContacts('')
        if (cancelled) return
        const leads = contacts.filter(c => !c.IsCompany).map(contactToLead)
        dispatch({ type: 'HYDRATE_LEADS', leads })
        setLoading(l => ({ ...l, leads: false }))
        announce(`${leads.length} ${leads.length === 1 ? 'lead' : 'leads'} loaded from LACRM.`)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Could not load leads from LACRM.'
        setError(e => ({ ...e, leads: message }))
        setLoading(l => ({ ...l, leads: false }))
        announce(`Error loading leads: ${message}`)
      }
    }
    hydrate()
    return () => { cancelled = true }
  }, [announce])

  // Write-through: create a LACRM contact per lead, adding each locally as
  // it succeeds so a mid-batch failure doesn't lose the earlier successes.
  const importLeads = useCallback(async (leads: Lead[]) => {
    for (const lead of leads) {
      const { ContactId } = await createLacrmContact(leadToLacrmContactInput(lead))
      dispatch({ type: 'ADD_LEAD', lead: { ...lead, id: ContactId } })
    }
  }, [])

  const updateLead = useCallback(
    async (id: string, patch: Partial<Omit<Lead, 'id' | 'importedAt'>>) => {
      dispatch({ type: 'UPDATE_LEAD', id, patch })

      if (!touchesLacrmFields(patch)) return
      const current = state.leads.find(l => l.id === id)
      if (!current) return
      try {
        await updateLacrmContact(id, leadToLacrmContactInput({ ...current, ...patch }))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not save the change to LACRM.'
        setError(e => ({ ...e, leads: message }))
        announce(`Error saving to LACRM: ${message}`)
      }
    },
    [state.leads, announce]
  )

  // No LACRM delete operation exists yet (T01's client only implements
  // read + write for contacts) — removes locally only, for now.
  const deleteLead = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_LEAD', id })
  }, [])

  // Call history isn't wired to LACRM Notes yet (T04) — stays local.
  const addCallLog = useCallback(async (log: Omit<CallLog, 'id'>) => {
    const id = `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    dispatch({ type: 'ADD_CALL_LOG', log: { ...log, id } })
  }, [])

  // Settings are device-local, not an LACRM concept.
  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', patch })
  }, [])

  return useMemo(
    () => ({
      leads: state.leads,
      callLogs: state.callLogs,
      settings: state.settings,
      loading,
      error,
      importLeads,
      updateLead,
      deleteLead,
      addCallLog,
      updateSettings,
    }),
    [state, loading, error, importLeads, updateLead, deleteLead, addCallLog, updateSettings]
  )
}
