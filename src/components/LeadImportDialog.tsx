import { useState, useRef } from 'react'
import FocusTrapDialog from './FocusTrapDialog'
import { useStore } from '../store/StoreContext'
import { useAnnounce } from '../hooks/useAnnounce'
import { parseLeadFile } from '../utils/parseLeadFile'
import { guessMapping, LEAD_FIELDS } from '../utils/guessMapping'
import type { Lead } from '../store/types'

type ImportStep = 'file' | 'mapping' | 'preview'

const STEP_LABELS: Record<ImportStep, string> = {
  file:    'Import leads — step 1 of 3: choose a file',
  mapping: 'Import leads — step 2 of 3: map columns',
  preview: 'Import leads — step 3 of 3: preview and confirm',
}

const STEP_NUMBERS: Record<ImportStep, number> = { file: 1, mapping: 2, preview: 3 }

interface LeadImportDialogProps {
  open: boolean
  onClose: () => void
  onImported: (count: number) => void
}

function rowToLead(row: Record<string, string>, mapping: Record<string, string | null>): Lead {
  const get = (field: string): string => {
    const col = mapping[field]
    return col ? (row[col] ?? '').trim() : ''
  }

  const getNum = (field: string): number | null => {
    const raw = get(field).replace(/[$,\s]/g, '')
    const n = parseFloat(raw)
    return isNaN(n) ? null : n
  }

  return {
    id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    company:         get('company') || 'Unknown company',
    contactName:     get('contactName'),
    email:           get('email'),
    phone:           get('phone'),
    city:            get('city'),
    state:           get('state'),
    timezone:        '',
    dealValue:       getNum('dealValue') ?? 0,
    stage:           get('stage'),
    score:           0,
    status:          'Cold',
    statusOverride:  null,
    pinned:          false,
    pinnedNote:      '',
    called:          false,
    lastContactDate: get('lastContactDate') || null,
    employees:       getNum('employees'),
    annualRevenue:   getNum('annualRevenue'),
    industry:        get('industry') || null,
    jobTitle:        get('jobTitle') || null,
    importedAt:      new Date().toISOString(),
  }
}

export default function LeadImportDialog({ open, onClose, onImported }: LeadImportDialogProps) {
  const store = useStore()
  const announce = useAnnounce()

  const [step, setStep] = useState<ImportStep>('file')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string | null>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)

  function reset() {
    setStep('file')
    setHeaders([])
    setRows([])
    setMapping({})
    setBusy(false)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setBusy(true)
    announce('Reading your file, please wait.')

    try {
      const result = await parseLeadFile(file)
      const guessed = guessMapping(result.headers)
      setHeaders(result.headers)
      setRows(result.rows)
      setMapping(guessed)
      setStep('mapping')
      announce(
        `File read successfully. Found ${result.rows.length} ${result.rows.length === 1 ? 'row' : 'rows'} ` +
        `and ${result.headers.length} columns. Check the field matching below.`
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not read the file.'
      setError(msg)
      announce(`Error: ${msg}`)
    } finally {
      setBusy(false)
    }
  }

  function handleMappingChange(field: string, column: string | null) {
    setMapping(prev => ({ ...prev, [field]: column === '' ? null : column }))
  }

  function canProceedFromMapping(): boolean {
    return LEAD_FIELDS.filter(f => f.required).every(f => mapping[f.key] != null)
  }

  function handleMappingNext() {
    if (!canProceedFromMapping()) {
      const msg = 'Please match the "Company name" column before continuing — it is required.'
      setError(msg)
      announce(`Error: ${msg}`)
      errorRef.current?.focus()
      return
    }
    setError(null)
    setStep('preview')
    const mappedCount = LEAD_FIELDS.filter(f => mapping[f.key] != null).length
    announce(
      `Showing a preview of the first leads. ${mappedCount} fields matched. ` +
      `Choose "Import" to add all ${rows.length} ${rows.length === 1 ? 'lead' : 'leads'} to the app.`
    )
  }

  async function handleConfirm() {
    setBusy(true)
    announce('Importing leads, please wait.')
    try {
      const leads = rows.map(row => rowToLead(row, mapping))
      await store.importLeads(leads)
      const count = leads.length
      announce(
        `Import complete. ${count} ${count === 1 ? 'lead was' : 'leads were'} added to All Leads.`
      )
      onImported(count)
      reset()
      onClose()
    } catch {
      const msg = 'Something went wrong during import. Please try again.'
      setError(msg)
      announce(`Error: ${msg}`)
      setBusy(false)
    }
  }

  const previewLeads = step === 'preview'
    ? rows.slice(0, 5).map(r => rowToLead(r, mapping))
    : []

  return (
    <FocusTrapDialog
      open={open}
      onClose={handleClose}
      label={STEP_LABELS[step]}
      closeLabel="Cancel import"
    >
      <p className="import-step-indicator" aria-hidden="true">
        Step {STEP_NUMBERS[step]} of 3
      </p>

      {/* ── Step 1: File picker ──────────────────────────────────── */}
      {step === 'file' && (
        <>
          <h2 className="dialog-heading">Import leads from a spreadsheet</h2>
          <p className="dialog-body">
            Choose an Excel (.xlsx or .xls) or CSV file from your computer.
            Your data stays on this device — nothing is sent anywhere.
          </p>

          {error && (
            <p ref={errorRef} className="dialog-error" role="alert" tabIndex={-1}>
              {error}
            </p>
          )}

          <div className="import-file-field">
            <label htmlFor="lead-file-input" className="import-file-label">
              Choose file
            </label>
            <input
              id="lead-file-input"
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={busy}
              className="import-file-input"
            />
          </div>

          {busy && (
            <p className="import-busy" aria-live="polite" aria-atomic="true">
              Reading file…
            </p>
          )}
        </>
      )}

      {/* ── Step 2: Column mapping ───────────────────────────────── */}
      {step === 'mapping' && (
        <>
          <h2 className="dialog-heading">Match your columns to lead fields</h2>
          <p className="dialog-body">
            We guessed the matches below — check each one and correct any that are wrong.
            Fields marked with <abbr title="required">*</abbr> must be matched.
          </p>

          {error && (
            <p ref={errorRef} className="dialog-error" role="alert" tabIndex={-1}>
              {error}
            </p>
          )}

          <div
            className="import-mapping-list"
            role="group"
            aria-label="Column matching"
          >
            {LEAD_FIELDS.map(({ key, label, required }) => (
              <div key={key} className="import-mapping-row">
                <label htmlFor={`map-${key}`} className="import-mapping-label">
                  {label}
                  {required && <span aria-label="required"> *</span>}
                </label>
                <select
                  id={`map-${key}`}
                  value={mapping[key] ?? ''}
                  onChange={e => handleMappingChange(key, e.target.value)}
                  className="import-mapping-select"
                >
                  <option value="">— Not in my file —</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="import-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setError(null); setStep('file') }}
            >
              Back
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleMappingNext}
            >
              Preview leads
            </button>
          </div>
        </>
      )}

      {/* ── Step 3: Preview + confirm ────────────────────────────── */}
      {step === 'preview' && (
        <>
          <h2 className="dialog-heading">Preview</h2>
          <p className="dialog-body">
            Showing the first {Math.min(5, rows.length)} of{' '}
            {rows.length} {rows.length === 1 ? 'lead' : 'leads'} that will be added.
          </p>

          {error && (
            <p ref={errorRef} className="dialog-error" role="alert" tabIndex={-1}>
              {error}
            </p>
          )}

          <ul className="import-preview-list" aria-label="Lead preview">
            {previewLeads.map((lead, i) => (
              <li key={i} className="import-preview-item">
                <span className="import-preview-company">{lead.company}</span>
                {lead.contactName && (
                  <span className="import-preview-detail"> — {lead.contactName}</span>
                )}
                {lead.dealValue > 0 && (
                  <span className="import-preview-detail">
                    {' '}— ${lead.dealValue.toLocaleString()}
                  </span>
                )}
                {lead.city && lead.state && (
                  <span className="import-preview-detail">
                    {' '}— {lead.city}, {lead.state}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {rows.length > 5 && (
            <p className="import-preview-more">
              …and {rows.length - 5} more
            </p>
          )}

          <div className="import-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setError(null); setStep('mapping') }}
              disabled={busy}
            >
              Back
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleConfirm}
              disabled={busy}
            >
              {busy
                ? 'Importing…'
                : `Import ${rows.length} ${rows.length === 1 ? 'lead' : 'leads'}`}
            </button>
          </div>
        </>
      )}
    </FocusTrapDialog>
  )
}
