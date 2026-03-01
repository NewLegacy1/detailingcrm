/**
 * Public demo mockup: Invoicing screen for landing page iframe.
 */
export const dynamic = 'force-static'

const DEMO_INVOICES = [
  { client: 'Sarah M.', service: 'Full Detail', amount: '$280', date: 'Feb 28, 2026', status: 'Sent' },
  { client: 'James K.', service: 'Ceramic Coating', amount: '$650', date: 'Feb 27, 2026', status: 'Paid' },
  { client: 'Mike T.', service: 'Express Wash & Wax', amount: '$85', date: 'Feb 26, 2026', status: 'Draft' },
]

export default function DemoInvoicingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg, #0c111a)',
        color: 'var(--text-1, #eef2ff)',
        fontFamily: 'var(--font-instrument), system-ui, sans-serif',
        padding: 20,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text-1)' }}>Invoices</h1>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '8px 14px',
            borderRadius: 8,
            background: 'var(--accent, #00b8f5)',
            color: '#000',
          }}
        >
          Send invoice
        </span>
      </div>

      <div
        style={{
          background: 'var(--surface-1, #111620)',
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 80px 100px 70px',
            gap: 12,
            padding: '12px 16px',
            fontSize: '0.65rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-3, #64748b)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span>Client</span>
          <span>Service</span>
          <span>Amount</span>
          <span>Date</span>
          <span>Status</span>
        </div>
        {DEMO_INVOICES.map((inv) => (
          <div
            key={inv.client + inv.service}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 80px 100px 70px',
              gap: 12,
              padding: '14px 16px',
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              fontSize: 14,
            }}
          >
            <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{inv.client}</span>
            <span style={{ color: 'var(--text-2)' }}>{inv.service}</span>
            <span style={{ color: 'var(--text-1)', fontFamily: 'ui-monospace' }}>{inv.amount}</span>
            <span style={{ color: 'var(--text-3)', fontSize: 13 }}>{inv.date}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 6,
                background:
                  inv.status === 'Paid'
                    ? 'rgba(0,212,126,0.2)'
                    : inv.status === 'Sent'
                      ? 'rgba(0,184,245,0.15)'
                      : 'rgba(255,255,255,0.06)',
                color: inv.status === 'Paid' ? '#00d47e' : inv.status === 'Sent' ? '#00b8f5' : 'var(--text-3)',
              }}
            >
              {inv.status}
            </span>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 16, fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>
        Demo · Sign up to create real invoices
      </p>
    </div>
  )
}
