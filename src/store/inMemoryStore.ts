import { useCallback, useMemo, useReducer } from 'react'
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

const DEFAULT_SETTINGS: Settings = {
  hotScoreThreshold: 75,
  warmScoreThreshold: 50,
  scoreQualificationThreshold: 0,   // pass-all until Greg & Tim confirm the number
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
}

// ── Scoring helper ─────────────────────────────────────────────────────────────
// Scores a lead, then resolves status (statusOverride wins over derived status).

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

// ── Reducer ───────────────────────────────────────────────────────────────────

interface State {
  leads: Lead[]
  callLogs: CallLog[]
  settings: Settings
}

type Action =
  | { type: 'IMPORT_LEADS'; leads: Lead[] }
  | { type: 'UPDATE_LEAD'; id: string; patch: Partial<Omit<Lead, 'id' | 'importedAt'>> }
  | { type: 'DELETE_LEAD'; id: string }
  | { type: 'ADD_CALL_LOG'; log: CallLog }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<Settings> }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'IMPORT_LEADS':
      return {
        ...state,
        leads: [
          ...state.leads,
          ...action.leads.map(l => applyScoring(l, state.settings)),
        ],
      }

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

// M0: loading is always false, errors are always null (no network calls)
const STATIC_LOADING: StoreLoading = { leads: false, callLogs: false, settings: false }
const STATIC_ERROR: StoreError = { leads: null, callLogs: null, settings: null }

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useInMemoryStore(): AppStore {
  const [state, dispatch] = useReducer(reducer, {
    leads: [],
    callLogs: [],
    settings: DEFAULT_SETTINGS,
  })

  const importLeads = useCallback(async (leads: Lead[]) => {
    dispatch({ type: 'IMPORT_LEADS', leads })
  }, [])

  const updateLead = useCallback(
    async (id: string, patch: Partial<Omit<Lead, 'id' | 'importedAt'>>) => {
      dispatch({ type: 'UPDATE_LEAD', id, patch })
    },
    []
  )

  const deleteLead = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_LEAD', id })
  }, [])

  const addCallLog = useCallback(async (log: Omit<CallLog, 'id'>) => {
    const id = `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    dispatch({ type: 'ADD_CALL_LOG', log: { ...log, id } })
  }, [])

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', patch })
  }, [])

  return useMemo(
    () => ({
      leads: state.leads,
      callLogs: state.callLogs,
      settings: state.settings,
      loading: STATIC_LOADING,
      error: STATIC_ERROR,
      importLeads,
      updateLead,
      deleteLead,
      addCallLog,
      updateSettings,
    }),
    [state, importLeads, updateLead, deleteLead, addCallLog, updateSettings]
  )
}
