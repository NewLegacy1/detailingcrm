'use client'

import { nativeAuthStyles as styles } from '@/components/login/native-auth-styles'

type Props = {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function OnboardingFeatureCheckRow({ id, label, checked, onChange }: Props) {
  return (
    <label
      htmlFor={id}
      style={{
        ...styles.onboardingGlassRow,
        border: checked ? '1px solid rgba(0,184,245,0.38)' : '1px solid rgba(0,184,245,0.12)',
        background: checked ? 'rgba(0,184,245,0.09)' : 'rgba(12,16,24,0.45)',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden
        style={{
          width: 24,
          height: 24,
          borderRadius: 8,
          border: checked ? '2px solid #00b8f5' : '2px solid rgba(90,106,128,0.45)',
          background: checked ? '#00b8f5' : 'rgba(8,12,20,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: checked ? '0 0 0 3px rgba(0,184,245,0.12)' : 'none',
          transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
        }}
      >
        {checked ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2 6l3 3 5-6"
              stroke="#080c14"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span style={{ fontSize: '0.95rem', color: '#dce6ec', fontWeight: 500 }}>{label}</span>
    </label>
  )
}
