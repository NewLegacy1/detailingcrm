/**
 * Public demo CRM view for landing page iframe.
 * No auth; hardcoded demo data so the landing can show "the CRM" with sample content.
 */
export const dynamic = 'force-static'

const DEMO_JOBS = [
  { client: 'Sarah M.', service: 'Full Detail', time: '9:00 AM', status: 'scheduled', address: '123 Oak St' },
  { client: 'James K.', service: 'Ceramic Coating', time: '1:00 PM', status: 'in_progress', address: '456 Pine Ave' },
  { client: 'Mike T.', service: 'Express Wash', time: '4:00 PM', status: 'scheduled', address: '789 Elm Dr' },
]

const DEMO_ACTIVITY = [
  { title: 'Sarah M. · Full Detail', subtitle: 'Feb 28, 9:00 AM', done: false },
  { title: 'James K. · Ceramic Coating', subtitle: 'Feb 27, 2:30 PM', done: true },
  { title: 'Mike T. · Express Wash', subtitle: 'Feb 27, 11:00 AM', done: true },
]

export default function DemoCrmPage() {
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
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text-1)' }}>
          Dashboard
        </h1>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          { label: "TODAY'S REVENUE", value: '$420' },
          { label: 'JOBS TODAY', value: '3' },
          { label: 'MONTHLY REVENUE', value: '$4,280', delta: '+12% vs last month', deltaUp: true },
          { label: 'EXPECTED TODAY', value: '$680' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: 'var(--surface-1, #111620)',
              border: '1px solid var(--border, rgba(255,255,255,0.08))',
              borderRadius: 10,
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-3, #64748b)',
                marginBottom: 6,
              }}
            >
              {stat.label}
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-1)' }}>
              {stat.value}
            </div>
            {stat.delta && (
              <div style={{ fontSize: 11, color: 'var(--green, #00d47e)', marginTop: 4 }}>
                {stat.delta}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <h2
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-2)',
            margin: '0 0 12px 0',
          }}
        >
          TODAY'S JOBS
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DEMO_JOBS.map((job) => (
            <div
              key={job.client + job.time}
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>
                  {job.client} · {job.service}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {job.time} · {job.address}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background:
                    job.status === 'in_progress'
                      ? 'rgba(245,158,11,0.2)'
                      : 'rgba(0,184,245,0.15)',
                  color: job.status === 'in_progress' ? '#f59e0b' : '#00b8f5',
                }}
              >
                {job.status === 'in_progress' ? 'In progress' : 'Scheduled'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-2)',
            margin: '0 0 10px 0',
          }}
        >
          RECENT ACTIVITY
        </h2>
        <div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 14,
          }}
        >
          {DEMO_ACTIVITY.map((item) => (
            <div
              key={item.title}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                paddingBottom: 10,
                borderBottom: '1px solid var(--border)',
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: item.done ? 'var(--green, #00d47e)' : 'var(--accent, #00b8f5)',
                  flexShrink: 0,
                  marginTop: 5,
                }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{item.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p
        style={{
          marginTop: 16,
          fontSize: 11,
          color: 'var(--text-3)',
          textAlign: 'center',
        }}
      >
        Demo view · Sign up to use the real CRM
      </p>
    </div>
  )
}
