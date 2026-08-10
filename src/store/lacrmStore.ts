/**
 * M1-T02/T03/T04 — LACRM-backed AppStore implementation.
 *
 * Fulfils the same async AppStore contract as M0's useInMemoryStore, so no
 * consuming component changes. Leads, pipeline stage, scoring inputs
 * (score/statusOverride/employees/annualRevenue/industry/dealValue — as
 * custom fields, T04), Watchlist pin state (pinned/pinnedNote — as custom
 * fields, T06/D-26), nurture state (nurtureEnrolled/nurtureEnrolledAt/
 * nurtureTouches/nurtureArchived — as custom fields, M3-T01) and call
 * history (as Notes, T04) all read-through from LACRM on mount and
 * write-through on create/edit. `Settings` stays local-only — it isn't an
 * LACRM concept.
 *
 * Score persistence (D-24): the score total and its per-criterion breakdown
 * are *stored* (not purely recomputed on read) so a reload restores the
 * exact last-known-accurate value, rather than depending on every scoring
 * input already being present and correct at hydrate time. Local edits still
 * recompute live via applyScoring() and push the fresh result back to LACRM,
 * same as M0 — only the *read* path trusts the stored value.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  AppStore,
  CallLog,
  Lead,
  Settings,
  StoreError,
  StoreLoading,
  SyncState,
  TOP_TIER_MAX,
} from './types'
import { scoreLead, deriveStatus } from '../scoring/scoreLead'
import { useAnnounce } from '../hooks/useAnnounce'
import { withRetry, isOnline, OfflineError } from '../utils/retry'
import {
  getAllLacrmContacts,
  createLacrmContact,
  updateLacrmContact,
  getLacrmPipelines,
  getAllPipelineItems,
  createPipelineItem,
  editPipelineItem,
  getCustomFields,
  createCustomField,
  getAllNotes,
  createNote,
  LacrmContact,
  LacrmPipeline,
} from '../utils/lacrmApi'
import {
  leadToLacrmContactInput,
  lacrmContactToLeadPatch,
  canonicalStageName,
  displayStageName,
  resolveStageStatusId,
  statusIdToStageName,
  selectSalesPipeline,
  SALESFORGE_CUSTOM_FIELDS,
  callLogToNoteText,
  noteToCallLog,
} from '../utils/lacrmMapping'

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

// Fields LACRM's Contact record can hold, natively (T01) or as a T04 custom
// field. A patch touching any of these needs a write-through EditContact
// call. `stage` is deliberately excluded — it's handled separately via the
// pipeline-items API (syncStageToLacrm), not a Contact field.
const LACRM_MAPPED_FIELDS = [
  'contactName', 'company', 'email', 'phone', 'city', 'state', 'jobTitle',
  'employees', 'annualRevenue', 'industry', 'dealValue', 'statusOverride',
  'pinned', 'pinnedNote',
  // M3-T01 — nurture state (closes B-03).
  'nurtureEnrolled', 'nurtureEnrolledAt', 'nurtureTouches', 'nurtureArchived',
] as const

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

// Fills in `stage` (filled in separately once pipeline items are known) —
// stage isn't a Contact field, it's resolved from pipeline items by the
// caller. Everything else — including score/status and now pinned/pinnedNote
// (T06/D-26) — comes straight from the synced custom fields via
// lacrmContactToLeadPatch(), not recomputed; see the module comment for why.
// `called`/`lastContactDate` are filled in by the caller from synced
// call-log Notes, same as `stage`.
function contactToLead(contact: LacrmContact, settings: Settings): Lead {
  const patch = lacrmContactToLeadPatch(contact)
  const score = patch.score ?? 0
  const statusOverride = patch.statusOverride ?? null
  return {
    id: contact.ContactId,
    company: patch.company ?? '',
    contactName: patch.contactName ?? '',
    email: patch.email ?? '',
    phone: patch.phone ?? '',
    city: patch.city ?? '',
    state: patch.state ?? '',
    timezone: '',
    dealValue: patch.dealValue ?? 0,
    stage: '',
    score,
    scoreBreakdown: patch.scoreBreakdown ?? [],
    status: statusOverride ?? deriveStatus(score, settings),
    statusOverride,
    pinned: patch.pinned ?? false,
    pinnedNote: patch.pinnedNote ?? '',
    called: false,
    lastContactDate: null,
    employees: patch.employees ?? null,
    annualRevenue: patch.annualRevenue ?? null,
    industry: patch.industry ?? null,
    jobTitle: patch.jobTitle ?? null,
    nurtureEnrolled: patch.nurtureEnrolled ?? false,
    nurtureEnrolledAt: patch.nurtureEnrolledAt ?? null,
    nurtureTouches: patch.nurtureTouches ?? [],
    nurtureArchived: patch.nurtureArchived ?? false,
    // Found 2026-08-10 verifying M3-T01 against the live account: this was unconditionally
    // `new Date().toISOString()` — "now," on every single hydrate. isGoneQuiet() (leadActivity.ts)
    // falls back to importedAt when lastContactDate is null (true for effectively every real
    // lead, since call-logging through this app is new) — resetting it to "now" on every load
    // meant no lead could *ever* register as gone-quiet against real data, silently, since M1-T04.
    // LACRM's real DateCreated is the correct, stable value.
    importedAt: contact.DateCreated ?? new Date().toISOString(),
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
  | { type: 'HYDRATE_CALL_LOGS'; callLogs: CallLog[] }
  | { type: 'ADD_LEAD'; lead: Lead }
  | { type: 'UPDATE_LEAD'; id: string; patch: Partial<Omit<Lead, 'id' | 'importedAt'>> }
  | { type: 'DELETE_LEAD'; id: string }
  | { type: 'ADD_CALL_LOG'; log: CallLog }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<Settings> }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    // Trusts the leads as handed in (score/status included) — the caller
    // (hydrate()) has already restored them from synced custom fields /
    // call-log Notes. Do NOT re-run applyScoring here: that would recompute
    // from whatever's known locally right now (nothing, on a fresh load) and
    // clobber the accurate persisted value. See module comment.
    case 'HYDRATE_LEADS':
      return { ...state, leads: action.leads }

    case 'HYDRATE_CALL_LOGS':
      return { ...state, callLogs: action.callLogs }

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

    // Logging a call is the one place `called`/`lastContactDate` change —
    // derived here from call-log dates instead of being separately
    // LACRM-synced fields, so they're automatically as durable as the call
    // history itself (see markAsCalled() in LeadDrawer.tsx, which now logs
    // a minimal call rather than patching these directly).
    case 'ADD_CALL_LOG':
      return {
        ...state,
        callLogs: [...state.callLogs, action.log],
        leads: state.leads.map(l => {
          if (l.id !== action.log.leadId) return l
          const isNewer = !l.lastContactDate || action.log.date > l.lastContactDate
          return { ...l, called: true, lastContactDate: isNewer ? action.log.date : l.lastContactDate }
        }),
      }

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

// Creates any of SALESFORGE_CUSTOM_FIELDS missing from this LACRM account (first hydrate
// only — a no-op every time after). Best-effort and non-fatal: if it fails (or an account
// already has all the fields), leads/pipeline still load — the next write attempt will just
// surface its own error via reportLacrmError() if the fields genuinely aren't there.
async function ensureSalesforgeCustomFields(): Promise<void> {
  try {
    const existing = await getCustomFields()
    const existingNames = new Set(existing.map(f => f.Name))
    const missing = SALESFORGE_CUSTOM_FIELDS.filter(f => !existingNames.has(f.Name))
    // Each field's create is independent — a single bad/rejected spec (found 2026-08-10: the
    // Currency-type fields were missing a required LACRM parameter, see lacrmMapping.ts) must
    // not silently block every field *after* it in the array. That's exactly what happened here
    // for 4+ days before it was caught: Annual Revenue failed, so Industry/Deal Value/Pinned/
    // Pinned Note/all 4 nurture fields never even got attempted.
    for (const field of missing) {
      try {
        await createCustomField(field)
      } catch {
        // Swallowed per-field, same rationale as the outer catch below.
      }
    }
  } catch {
    // Swallowed — see comment above.
  }
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useLacrmStore(): AppStore {
  const [state, dispatch] = useReducer(reducer, {
    leads: [],
    callLogs: [],
    settings: DEFAULT_SETTINGS,
  })
  const [loading, setLoading] = useState<StoreLoading>({ ...STATIC_LOADING, leads: true })
  const [error, setError] = useState<StoreError>(STATIC_ERROR)
  const [syncState, setSyncState] = useState<SyncState>(() => ({
    status: isOnline() ? 'idle' : 'offline',
    pendingCount: 0,
    lastError: null,
    lastSyncedAt: null,
  }))
  const announce = useAnnounce()

  // The confirmed sales pipeline (B-01) and each contact's current
  // PipelineItemId, once known — populated by hydrate(), consulted and
  // updated by stage writes. Ref, not state: this is sync bookkeeping the
  // UI never reads directly (Lead.stage is what's rendered).
  const pipelineRef = useRef<LacrmPipeline | null>(null)
  const pipelineItemIdsRef = useRef<Map<string, string>>(new Map())

  // Browser connectivity, tracked independent of any in-flight write — this is what lets an
  // "offline" sync status appear the instant the connection drops, not just the next time
  // something tries (and fails) to write. See SyncStatusIndicator.tsx for how it's shown.
  useEffect(() => {
    function handleOffline() {
      setSyncState(s => ({ ...s, status: 'offline' }))
      announce("You're offline. Changes will not be saved to LACRM until you're back online.")
    }
    function handleOnline() {
      setSyncState(s => ({ ...s, status: s.pendingCount > 0 ? 'syncing' : 'idle' }))
      announce('Back online.')
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [announce])

  // ── M1-T05: write-through retry/backoff + sync-state bookkeeping ────────
  //
  // Every LACRM write in this file goes through syncWrite() so retry policy,
  // the pending counter, and the offline/error/idle status the UI shows are
  // all handled in exactly one place instead of being reimplemented per call
  // site. syncWrite rethrows on failure (OfflineError or RetryExhaustedError,
  // see utils/retry.ts) — callers decide what "LACRM wins" means for their
  // own optimistic state (usually: revert it).

  function beginWrite() {
    setSyncState(s => ({ ...s, pendingCount: s.pendingCount + 1, status: isOnline() ? 'syncing' : 'offline' }))
  }

  function endWriteSuccess() {
    setSyncState(s => {
      const pendingCount = Math.max(0, s.pendingCount - 1)
      return { pendingCount, status: pendingCount > 0 ? s.status : 'idle', lastError: null, lastSyncedAt: new Date().toISOString() }
    })
  }

  function endWriteFailure(err: unknown): string {
    const offline = err instanceof OfflineError
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    setSyncState(s => {
      const pendingCount = Math.max(0, s.pendingCount - 1)
      return { ...s, pendingCount, status: offline ? 'offline' : 'error', lastError: offline ? s.lastError : message }
    })
    return message
  }

  async function syncWrite<T>(fn: () => Promise<T>): Promise<T> {
    beginWrite()
    try {
      const result = await withRetry(fn)
      endWriteSuccess()
      return result
    } catch (err) {
      endWriteFailure(err)
      throw err
    }
  }

  function reportLacrmError(verb: string, err: unknown) {
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    setError(e => ({ ...e, leads: message }))
    announce(`Error trying to ${verb}: ${message}`)
  }

  // Read-through: populate leads + pipeline stage from LACRM once on mount. Deliberately no
  // "already hydrated" ref guard around this — that pattern looks like it prevents a double
  // fetch under StrictMode's dev-only double-invoke, but it does the opposite: the ref persists
  // across StrictMode's mount→cleanup→remount, so it blocks the *second* (surviving) effect
  // invocation from ever calling hydrate(), while the *first* invocation's hydrate() keeps
  // running to completion and then silently discards its own results at every
  // `if (cancelled) return` once its cleanup (from the phantom unmount) has already flipped
  // `cancelled` to true. Net effect: every request fires, nothing is ever dispatched, forever —
  // exactly the bug this comment is here so nobody reintroduces. The plain cancelled-closure
  // pattern below is the React-recommended one and is StrictMode-safe on its own: the phantom
  // first invocation's fetch is (harmlessly, dev-only) wasted, the second one completes and
  // dispatches normally. Production builds don't double-invoke effects, so this costs nothing there.
  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      try {
        const [contacts, pipelines, notes] = await Promise.all([
          getAllLacrmContacts(),
          getLacrmPipelines(),
          getAllNotes(),
          ensureSalesforgeCustomFields(),
        ])
        if (cancelled) return

        const salesPipeline = selectSalesPipeline(pipelines)
        pipelineRef.current = salesPipeline

        const itemsByContactId = new Map<string, { statusId: string; pipelineItemId: string }>()
        if (salesPipeline) {
          const items = await getAllPipelineItems(salesPipeline.PipelineId)
          if (cancelled) return
          for (const item of items) {
            itemsByContactId.set(item.ContactId, { statusId: item.StatusId, pipelineItemId: item.PipelineItemId })
            pipelineItemIdsRef.current.set(item.ContactId, item.PipelineItemId)
          }
        }

        // Call history: SalesForge-authored Notes only (noteToCallLog() filters
        // out anything else), plus the per-lead called/lastContactDate they imply.
        const callLogs = notes
          .map(noteToCallLog)
          .filter((c): c is CallLog => c !== null)
        const activityByContactId = new Map<string, { called: boolean; lastContactDate: string }>()
        for (const log of callLogs) {
          const existing = activityByContactId.get(log.leadId)
          if (!existing || log.date > existing.lastContactDate) {
            activityByContactId.set(log.leadId, { called: true, lastContactDate: log.date })
          }
        }

        const leads = contacts
          .filter(c => !c.IsCompany)
          .map(contact => {
            const lead = contactToLead(contact, state.settings)
            const placement = itemsByContactId.get(contact.ContactId)
            if (placement && salesPipeline) {
              lead.stage = statusIdToStageName(placement.statusId, salesPipeline) ?? ''
            }
            const activity = activityByContactId.get(contact.ContactId)
            if (activity) {
              lead.called = activity.called
              lead.lastContactDate = activity.lastContactDate
            }
            return lead
          })

        dispatch({ type: 'HYDRATE_LEADS', leads })
        dispatch({ type: 'HYDRATE_CALL_LOGS', callLogs })
        setLoading(l => ({ ...l, leads: false }))
        setSyncState(s => ({ ...s, status: s.pendingCount > 0 ? s.status : 'idle', lastSyncedAt: new Date().toISOString() }))
        announce(`${leads.length} ${leads.length === 1 ? 'lead' : 'leads'} loaded from LACRM.`)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Could not load leads from LACRM.'
        setError(e => ({ ...e, leads: message }))
        setLoading(l => ({ ...l, leads: false }))
        setSyncState(s => ({ ...s, status: isOnline() ? 'error' : 'offline', lastError: message }))
        announce(`Error loading leads: ${message}`)
      }
    }
    hydrate()
    return () => { cancelled = true }
  }, [announce])

  // Resolves a stage string to LACRM's canonical placement and, unless it's
  // one of the pre-qualification (no-pipeline) states, writes it through to
  // the contact's pipeline item — creating one if this is its first
  // placement. Returns the label the app should display. Each API call goes
  // through syncWrite() (retry/backoff — M1-T05); throws OfflineError or
  // RetryExhaustedError on exhausted failure so callers can decide
  // fatal-vs-not for their context.
  const syncStageToLacrm = useCallback(async (contactId: string, rawStage: string): Promise<string> => {
    const resolvedStage = displayStageName(rawStage)
    const pipeline = pipelineRef.current
    if (!pipeline) return resolvedStage // pipeline unknown (hydrate failed/pending) — can't place yet

    const statusId = resolveStageStatusId(canonicalStageName(rawStage), pipeline)
    if (!statusId) return resolvedStage // pre-qualification state — no pipeline placement

    const existingItemId = pipelineItemIdsRef.current.get(contactId)
    if (existingItemId) {
      await syncWrite(() => editPipelineItem(existingItemId, statusId))
    } else {
      const { PipelineItemId } = await syncWrite(() => createPipelineItem(contactId, pipeline.PipelineId, statusId))
      pipelineItemIdsRef.current.set(contactId, PipelineItemId)
    }
    return resolvedStage
  }, [])

  // Write-through: create a LACRM contact per lead (scored first, so the
  // initial score/breakdown/status land in the same create call — see
  // applyScoring()) plus its pipeline placement if it carries a stage,
  // adding each locally as it succeeds so a mid-batch failure doesn't lose
  // the earlier successes. A lead whose create call fails (even after
  // retries) is skipped rather than added with a fake id — LACRM wins:
  // nothing appears "imported" that LACRM doesn't actually have.
  const importLeads = useCallback(async (leads: Lead[]) => {
    let failures = 0
    for (const lead of leads) {
      const scored = applyScoring(lead, state.settings)
      let contactId: string
      try {
        const created = await syncWrite(() => createLacrmContact(leadToLacrmContactInput(scored)))
        contactId = created.ContactId
      } catch (err) {
        failures += 1
        reportLacrmError(`import ${lead.company || 'a lead'} to LACRM`, err)
        continue
      }
      let stage = scored.stage
      if (stage) {
        try {
          stage = await syncStageToLacrm(contactId, stage)
        } catch (err) {
          // The contact itself is safely created — a stage-placement hiccup
          // shouldn't lose the whole lead. Keep the display label, flag the error.
          stage = displayStageName(stage)
          reportLacrmError(`place ${lead.company || 'a lead'} in the pipeline`, err)
        }
      }
      dispatch({ type: 'ADD_LEAD', lead: { ...scored, id: contactId, stage } })
    }
    if (failures > 0) {
      announce(`${failures} ${failures === 1 ? 'lead' : 'leads'} could not be saved to LACRM and ${failures === 1 ? 'was' : 'were'} not imported.`)
    }
  }, [state.settings, syncStageToLacrm, announce])

  const updateLead = useCallback(
    async (id: string, patch: Partial<Omit<Lead, 'id' | 'importedAt'>>) => {
      dispatch({ type: 'UPDATE_LEAD', id, patch })
      const current = state.leads.find(l => l.id === id)
      if (!current) return

      // Recomputed once up front so both the contact-field write and the
      // score/breakdown/status custom fields in the same payload reflect the
      // same post-edit lead — including when the edit was to `stage`, which
      // several scoring criteria (S-05..S-08) key off of.
      const merged = applyScoring({ ...current, ...patch }, state.settings)

      if (touchesLacrmFields(patch) || patch.stage != null) {
        try {
          await syncWrite(() => updateLacrmContact(id, leadToLacrmContactInput(merged)))
        } catch (err) {
          // PRINCIPLE-01, "LACRM wins": the optimistic dispatch above never
          // actually landed in LACRM, so it can't be left on screen as if it
          // had — revert to the last LACRM-confirmed lead.
          dispatch({ type: 'UPDATE_LEAD', id, patch: current })
          reportLacrmError(`save the change for ${current.company || 'a lead'} to LACRM`, err)
        }
      }

      if (patch.stage != null && patch.stage !== current.stage) {
        try {
          const resolvedStage = await syncStageToLacrm(id, patch.stage)
          if (resolvedStage !== patch.stage) {
            dispatch({ type: 'UPDATE_LEAD', id, patch: { stage: resolvedStage } })
          }
        } catch (err) {
          dispatch({ type: 'UPDATE_LEAD', id, patch: { stage: current.stage } })
          reportLacrmError(`save the stage change for ${current.company || 'a lead'} to LACRM`, err)
        }
      }
    },
    [state.leads, state.settings, syncStageToLacrm]
  )

  // No LACRM delete operation exists yet (T01's client only implements
  // read + write for contacts) — removes locally only, for now.
  const deleteLead = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_LEAD', id })
  }, [])

  // Write-through: one LACRM Note per call log (see callLogToNoteText() /
  // noteToCallLog() in lacrmMapping.ts). NoteId becomes the CallLog's id —
  // a real, durable, cross-device id. Throws on failure rather than
  // swallowing it, so LogCallDialog's error path actually fires instead of
  // silently pretending the call was logged.
  const addCallLog = useCallback(async (log: Omit<CallLog, 'id'>) => {
    const { NoteId } = await syncWrite(() => createNote(log.leadId, callLogToNoteText(log), log.date))
    dispatch({ type: 'ADD_CALL_LOG', log: { ...log, id: NoteId } })
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
      syncState,
      importLeads,
      updateLead,
      deleteLead,
      addCallLog,
      updateSettings,
    }),
    [state, loading, error, syncState, importLeads, updateLead, deleteLead, addCallLog, updateSettings]
  )
}
