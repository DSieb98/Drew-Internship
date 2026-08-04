/**
 * M1-T05 — conflict resolution / "LACRM wins" / sync-state acceptance criteria, demonstrated
 * against the real useLacrmStore hook with the LACRM API client mocked out:
 *
 *  1. A write that ultimately fails (retries exhausted) reverts the optimistic local edit back
 *     to the last LACRM-confirmed value — a simulated conflict resolves to LACRM's version.
 *  2. Going offline (browser event, or offline at write time) produces a clear, announced
 *     'offline' sync status — never a crash or a silent no-op.
 *  3. A failed write is retried per the backoff policy in utils/retry.ts and, only once
 *     exhausted, is surfaced via syncState + the live region rather than silently dropped.
 *  4. A transient failure that recovers within the retry budget keeps the edit and returns to
 *     'idle' — sync errors aren't sticky once LACRM is reachable again.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useLacrmStore } from './lacrmStore'
import type { LacrmContact } from '../utils/lacrmApi'

const { mockAnnounce } = vi.hoisted(() => ({ mockAnnounce: vi.fn() }))
vi.mock('../hooks/useAnnounce', () => ({ useAnnounce: () => mockAnnounce }))

vi.mock('../utils/lacrmApi', () => ({
  getAllLacrmContacts: vi.fn(),
  createLacrmContact: vi.fn(),
  updateLacrmContact: vi.fn(),
  getLacrmPipelines: vi.fn(),
  getAllPipelineItems: vi.fn(),
  createPipelineItem: vi.fn(),
  editPipelineItem: vi.fn(),
  getCustomFields: vi.fn(),
  createCustomField: vi.fn(),
  getAllNotes: vi.fn(),
  createNote: vi.fn(),
}))

import * as lacrmApi from '../utils/lacrmApi'

const CONTACT_ID = 'contact-1'
const ORIGINAL_COMPANY = 'Acme Corp'

const baseContact: LacrmContact = {
  ContactId: CONTACT_ID,
  IsCompany: false,
  Name: { FirstName: 'Jane', LastName: 'Doe' },
  'Company Name': ORIGINAL_COMPANY,
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true })
}

async function setupHydratedStore() {
  const { result } = renderHook(() => useLacrmStore())
  await waitFor(() => expect(result.current.leads).toHaveLength(1))
  expect(result.current.leads[0].company).toBe(ORIGINAL_COMPANY)
  return result
}

beforeEach(() => {
  vi.clearAllMocks()
  setOnline(true)
  vi.mocked(lacrmApi.getAllLacrmContacts).mockResolvedValue([baseContact])
  vi.mocked(lacrmApi.getLacrmPipelines).mockResolvedValue([])
  vi.mocked(lacrmApi.getAllNotes).mockResolvedValue([])
  vi.mocked(lacrmApi.getCustomFields).mockResolvedValue([])
  vi.mocked(lacrmApi.createCustomField).mockResolvedValue({ CustomFieldId: 'cf-1' })
})

afterEach(() => {
  vi.useRealTimers()
  setOnline(true)
})

describe('useLacrmStore — M1-T05 conflict resolution & sync state', () => {
  it('reverts an optimistic edit and reports sync status "error" once retries are exhausted (LACRM wins)', async () => {
    const result = await setupHydratedStore()
    vi.mocked(lacrmApi.updateLacrmContact).mockRejectedValue(new Error('LACRM unreachable'))
    mockAnnounce.mockClear()

    vi.useFakeTimers()
    await act(async () => {
      const write = result.current.updateLead(CONTACT_ID, { company: 'Renamed Co' })
      await vi.runAllTimersAsync()
      await write
    })
    vi.useRealTimers()

    // The local edit never actually landed in LACRM — it must not be left on screen as if it had.
    expect(result.current.leads[0].company).toBe(ORIGINAL_COMPANY)
    expect(result.current.syncState.status).toBe('error')
    expect(result.current.syncState.lastError).toBeTruthy()
    // Default retry policy: 1 initial attempt + 3 retries.
    expect(lacrmApi.updateLacrmContact).toHaveBeenCalledTimes(4)
    // Never silent — the live region got an announcement about the failure.
    expect(mockAnnounce).toHaveBeenCalledWith(expect.stringContaining('Error trying to save the change'))
  })

  it('keeps the edit and returns to "idle" once a transient failure recovers within the retry budget', async () => {
    const result = await setupHydratedStore()
    vi.mocked(lacrmApi.updateLacrmContact)
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValueOnce(undefined)

    vi.useFakeTimers()
    await act(async () => {
      const write = result.current.updateLead(CONTACT_ID, { company: 'Renamed Co' })
      await vi.runAllTimersAsync()
      await write
    })
    vi.useRealTimers()

    expect(result.current.leads[0].company).toBe('Renamed Co')
    expect(result.current.syncState.status).toBe('idle')
    expect(result.current.syncState.lastSyncedAt).not.toBeNull()
    expect(lacrmApi.updateLacrmContact).toHaveBeenCalledTimes(2)
  })

  it('fails fast into "offline" status (no retries spent) and reverts, when offline at write time', async () => {
    const result = await setupHydratedStore()
    setOnline(false)
    mockAnnounce.mockClear()

    await act(async () => {
      await result.current.updateLead(CONTACT_ID, { company: 'Renamed Co' })
    })

    expect(result.current.leads[0].company).toBe(ORIGINAL_COMPANY)
    expect(result.current.syncState.status).toBe('offline')
    expect(lacrmApi.updateLacrmContact).not.toHaveBeenCalled()
    expect(mockAnnounce).toHaveBeenCalledWith(expect.stringContaining('Error trying to save the change'))
  })

  it('reflects a browser offline/online event in syncState and announces the transition, without crashing', async () => {
    const result = await setupHydratedStore()
    mockAnnounce.mockClear()

    await act(async () => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current.syncState.status).toBe('offline')
    expect(mockAnnounce).toHaveBeenCalledWith(expect.stringMatching(/offline/i))

    mockAnnounce.mockClear()
    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current.syncState.status).toBe('idle')
    expect(mockAnnounce).toHaveBeenCalledWith(expect.stringMatching(/back online/i))
  })
})
