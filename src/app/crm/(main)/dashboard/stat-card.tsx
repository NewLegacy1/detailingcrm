interface StatCardProps {
  label: string
  value: string | number
  delta?: string
  deltaUp?: boolean
}

export function StatCard({ label, value, delta, deltaUp }: StatCardProps) {
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '14px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)',
        }}
      />
      <div
        style={{
          fontSize: '0.67rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-3)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: 'var(--text-1)',
          fontSize: '1.5rem',
          fontWeight: 700,
          fontFamily: "ui-monospace, 'Geist Mono', monospace",
        }}
      >
        {value}
      </div>
      {delta != null && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-3)',
            marginTop: 4,
          }}
        >
          <span style={{ color: deltaUp === true ? 'var(--green)' : deltaUp === false ? 'var(--red)' : 'var(--text-3)' }}>
            {deltaUp === true ? '↑ ' : deltaUp === false ? '↓ ' : ''}
          </span>
          {delta}
        </div>
      )}
    </div>
  )
}
