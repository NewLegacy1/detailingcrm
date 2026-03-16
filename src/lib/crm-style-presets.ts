/**
 * CRM style presets: base CSS variable overrides. Applied by MainLayoutClient.
 * Custom Pro colors (crmColors) are layered on top when present.
 */

export type CrmStylePresetId = 'midnight' | 'carbon' | 'frost'

export interface CrmStylePreset {
  id: CrmStylePresetId
  label: string
  description: string
  /** For settings preview card */
  preview: { bg: string; accent: string; surface: string }
  /** CSS custom property overrides (--bg, --accent, --radius, etc.) */
  vars: Record<string, string>
}

/** Midnight: default deep navy, cyan accent, 10px radius. Clean, technical. */
const MIDNIGHT: CrmStylePreset = {
  id: 'midnight',
  label: 'Midnight',
  description: 'Deep navy with cyan accent. Clean and professional.',
  preview: { bg: '#07090f', accent: '#00b8f5', surface: '#111620' },
  vars: {
    '--bg': '#07090f',
    '--surface-1': '#0c0f18',
    '--surface-2': '#111620',
    '--surface-3': '#181e2c',
    '--surface-4': '#1e2638',
    '--border': 'rgba(255, 255, 255, 0.055)',
    '--border-hi': 'rgba(255, 255, 255, 0.1)',
    '--text-1': '#eef2ff',
    '--text-2': '#7e8da8',
    '--text-3': '#3d4d65',
    '--text': '#eef2ff',
    '--text-secondary': '#7e8da8',
    '--text-muted': '#3d4d65',
    '--accent': '#00b8f5',
    '--accent-dim': 'rgba(0, 184, 245, 0.12)',
    '--bg-card': '#111620',
    '--radius': '10px',
    '--radius-lg': '14px',
    '--font-heading': 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
  },
}

/** Carbon: near-black, charcoal surfaces, orange accent, 6px radius, condensed headings. */
const CARBON: CrmStylePreset = {
  id: 'carbon',
  label: 'Carbon',
  description: 'Bold industrial look with orange accent.',
  preview: { bg: '#0a0a0a', accent: '#f97316', surface: '#171717' },
  vars: {
    '--bg': '#0a0a0a',
    '--surface-1': '#0f0f0f',
    '--surface-2': '#171717',
    '--surface-3': '#1f1f1f',
    '--surface-4': '#262626',
    '--border': 'rgba(255, 255, 255, 0.06)',
    '--border-hi': 'rgba(255, 255, 255, 0.12)',
    '--text-1': '#fafafa',
    '--text-2': '#a3a3a3',
    '--text-3': '#525252',
    '--text': '#fafafa',
    '--text-secondary': '#a3a3a3',
    '--text-muted': '#525252',
    '--accent': '#f97316',
    '--accent-dim': 'rgba(249, 115, 22, 0.12)',
    '--bg-card': '#171717',
    '--radius': '6px',
    '--radius-lg': '10px',
    '--font-heading': 'var(--font-rajdhani), ui-sans-serif, system-ui, sans-serif',
  },
}

/** Frost: light background, white surfaces, indigo accent, 14px radius, soft headings. */
const FROST: CrmStylePreset = {
  id: 'frost',
  label: 'Frost',
  description: 'Light and minimal with indigo accent.',
  preview: { bg: '#f0f4f8', accent: '#4f46e5', surface: '#ffffff' },
  vars: {
    '--bg': '#f0f4f8',
    '--surface-1': '#f8fafc',
    '--surface-2': '#ffffff',
    '--surface-3': '#e2e8f0',
    '--surface-4': '#cbd5e1',
    '--border': 'rgba(0, 0, 0, 0.08)',
    '--border-hi': 'rgba(0, 0, 0, 0.14)',
    '--text-1': '#0f172a',
    '--text-2': '#475569',
    '--text-3': '#64748b',
    '--text': '#0f172a',
    '--text-secondary': '#475569',
    '--text-muted': '#64748b',
    '--accent': '#4f46e5',
    '--accent-dim': 'rgba(79, 70, 229, 0.12)',
    '--bg-card': '#ffffff',
    '--radius': '14px',
    '--radius-lg': '18px',
    '--font-heading': 'var(--font-nunito), ui-sans-serif, system-ui, sans-serif',
  },
}

export const CRM_STYLE_PRESETS: Record<CrmStylePresetId, CrmStylePreset> = {
  midnight: MIDNIGHT,
  carbon: CARBON,
  frost: FROST,
}

export const CRM_STYLE_PRESET_IDS: CrmStylePresetId[] = ['midnight', 'carbon', 'frost']

export function getCrmStylePreset(id: CrmStylePresetId | null | undefined): CrmStylePreset {
  if (id && CRM_STYLE_PRESETS[id]) return CRM_STYLE_PRESETS[id]
  return MIDNIGHT
}
