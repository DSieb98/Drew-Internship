import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import LeadImportDialog from '../components/LeadImportDialog'

export default function AllLeadsPage() {
  const store = useStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [lastImportCount, setLastImportCount] = useState<number | null>(null)

  function handleImported(count: number) {
    setLastImportCount(count)
  }

  return (
    <section aria-labelledby="all-leads-heading">
      <h2 id="all-leads-heading" className="page-heading">All Leads</h2>

      <div className="all-leads-toolbar">
        <button
          type="button"
          className="btn-primary"
          onClick={() => setDialogOpen(true)}
        >
          Import leads from spreadsheet
        </button>
      </div>

      {lastImportCount !== null && (
        <div className="import-success-banner" role="status">
          {lastImportCount} {lastImportCount === 1 ? 'lead' : 'leads'} imported successfully.
        </div>
      )}

      {store.leads.length === 0 ? (
        <div className="placeholder-content">
          <p>No leads yet. Use the button above to import leads from a spreadsheet.</p>
        </div>
      ) : (
        <div className="interim-lead-panel">
          <p className="interim-lead-summary">
            <strong>{store.leads.length}</strong>{' '}
            {store.leads.length === 1 ? 'lead' : 'leads'} in store
            <span className="interim-badge" aria-label="Placeholder — full lead view coming in task T04">
              Interim view · full display coming in T04
            </span>
          </p>
          <ul className="interim-lead-list" aria-label="Imported leads">
            {store.leads.map(lead => (
              <li key={lead.id} className="interim-lead-item">
                <span className="interim-lead-company">{lead.company}</span>
                {lead.contactName && (
                  <span className="interim-lead-detail"> — {lead.contactName}</span>
                )}
                {lead.email && (
                  <span className="interim-lead-detail"> ({lead.email})</span>
                )}
                {lead.dealValue > 0 && (
                  <span className="interim-lead-detail">
                    {' '}— ${lead.dealValue.toLocaleString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <LeadImportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onImported={handleImported}
      />
    </section>
  )
}
