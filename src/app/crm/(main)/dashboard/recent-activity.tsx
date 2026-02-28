import Link from 'next/link'

interface ActivityItem {
  id: string
  title: string
  subtitle: string
  dotColor: string
}

interface RecentActivityProps {
  items: ActivityItem[]
}

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-2)',
          marginBottom: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Recent Activity
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No recent activity</div>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/jobs/${item.id}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: item.dotColor,
                  flexShrink: 0,
                  marginTop: 5,
                }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{item.subtitle}</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
