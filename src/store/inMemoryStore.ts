import { useCallback, useMemo, useReducer } from 'react'
import {
  AppStore,
  CallLog,
  Lead,
  Settings,
  StoreError,
  StoreLoading,
} from './types'

const DEFAULT_SETTINGS: Settings = {
  hotScoreThreshold: 75,
  warmScoreThreshold: 50,
  hotAlertMinDealValue: 10_000,
  dealHighThreshold: 25_000,
  dealMediumThreshold: 10_000,
  nurtureSilenceDays: 14,
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
      return { ...state, leads: [...state.leads, ...action.leads] }
    case 'UPDATE_LEAD':
      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === action.id ? { ...l, ...action.patch } : l
        ),
      }
    case 'DELETE_LEAD':
      return { ...state, leads: state.leads.filter(l => l.id !== action.id) }
    case 'ADD_CALL_LOG':
      return { ...state, callLogs: [...state.callLogs, action.log] }
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } }
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
