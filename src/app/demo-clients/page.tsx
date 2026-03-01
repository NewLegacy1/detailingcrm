/**
 * Public demo mockup: Client history / Customers screen for landing page iframe.
 */
export const dynamic = 'force-static'

const DEMO_CLIENTS = [
  { name: 'Sarah M.', email: 'sarah@email.com', jobs: 4, last: 'Feb 28' },
  { name: 'James K.', email: 'james.k@email.com', jobs: 2, last: 'Feb 27' },
  { name: 'Mike T.', email: 'mike.t@gmail.com', jobs: 6, last: 'Feb 26' },
]

export default function DemoClientsPage() {
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
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text-1)' }}>Customers</h1>
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
          New customer
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
        {DEMO_CLIENTS.map((c) => (
          <div
            key={c.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--accent-dim, rgba(0,184,245,0.15))',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {c.name.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.email}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {c.jobs} jobs · Last {c.last}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 14,
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 10,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>
          Notes per client
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
          Every car, every service, every note in one place. Know what they need before they pull up.
        </p>
      </div>

      <p style={{ marginTop: 16, fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>
        Demo · Sign up to manage your customers
      </p>
    </div>
  )
}
