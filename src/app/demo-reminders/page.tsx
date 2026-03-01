/**
 * Public demo mockup: Automated reminders / Automations screen for landing page iframe.
 */
export const dynamic = 'force-static'

const DEMO_ITEMS = [
  { label: 'Job reminder', desc: 'SMS + email before each job', when: '60 min before', on: true },
  { label: 'New booking notification', desc: 'Notify you when a client books', when: 'Immediately', on: true },
  { label: 'Review request', desc: 'Ask for feedback after job', when: '24 hours after', on: true },
  { label: 'Maintenance follow-up', desc: 'Suggest rebook at 14, 30, 45 days', when: 'Days after job', on: false },
]

export default function DemoRemindersPage() {
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
      <h1 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text-1)' }}>
        Automations
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
        Set it once — reminders and notifications run automatically.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {DEMO_ITEMS.map((item) => (
          <div
            key={item.label}
            style={{
              background: 'var(--surface-1, #111620)',
              border: '1px solid var(--border, rgba(255,255,255,0.08))',
              borderRadius: 10,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{item.desc}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{item.when}</div>
            </div>
            <div
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: item.on ? 'var(--accent, #00b8f5)' : 'var(--surface-2, #1a2332)',
                border: '1px solid var(--border)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 2,
                  left: item.on ? 22 : 2,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 16, fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>
        Demo · Sign up to configure your automations
      </p>
    </div>
  )
}
