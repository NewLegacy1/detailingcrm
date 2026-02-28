'use client'

import { useEffect, useRef } from 'react'

const BG = ['#0a1628', '#0d1e35', '#111d30', '#0f1929'] as const

// Faint SVG icons — each sized via viewBox so JS can resize them freely
const ICONS = [
  // Car silhouette
  `<svg viewBox="0 0 40 26" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 17H4a1 1 0 01-1-1v-2a1 1 0 011-1h32a1 1 0 011 1v2a1 1 0 01-1 1h-2" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M9.5 13.5l2.8-7.5h15.4l2.8 7.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="11" cy="20.5" r="2.8" stroke="white" stroke-width="1.8"/>
    <circle cx="29" cy="20.5" r="2.8" stroke="white" stroke-width="1.8"/>
  </svg>`,
  // Calendar
  `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="17" rx="2" stroke="white" stroke-width="1.6"/>
    <path d="M16 2v4M8 2v4M3 9h18" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="8" cy="14" r="1.2" fill="white"/>
    <circle cx="12" cy="14" r="1.2" fill="white"/>
    <circle cx="16" cy="14" r="1.2" fill="white"/>
    <circle cx="8" cy="18" r="1.2" fill="white"/>
    <circle cx="12" cy="18" r="1.2" fill="white"/>
  </svg>`,
  // Clock
  `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="white" stroke-width="1.6"/>
    <path d="M12 7v5l3.5 3.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  // Star
  `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="white" stroke-width="1.6" stroke-linejoin="round"/>
  </svg>`,
  // Wrench
  `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  // Map pin
  `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="white" stroke-width="1.6"/>
    <circle cx="12" cy="9" r="2.5" stroke="white" stroke-width="1.6"/>
  </svg>`,
  // Bar chart
  `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 20V10M12 20V4M6 20v-6" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`,
  // Credit card
  `<svg viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="22" height="14" rx="2.5" stroke="white" stroke-width="1.6"/>
    <path d="M1 6h22" stroke="white" stroke-width="2"/>
    <rect x="4" y="10" width="5" height="2.5" rx="0.8" fill="white" opacity="0.5"/>
    <rect x="11" y="10" width="3" height="2.5" rx="0.8" fill="white" opacity="0.25"/>
  </svg>`,
  // Lightning bolt
  `<svg viewBox="0 0 20 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 1L1 15.5h9L8 27l11-14.5h-9L11 1z" stroke="white" stroke-width="1.8" stroke-linejoin="round"/>
  </svg>`,
  // Check circle
  `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="white" stroke-width="1.6"/>
    <path d="M7.5 12l3 3 6-6" stroke="white" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  // Spray bottle / detailing tool
  `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 5h6v4H6z" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M9 9v10a2 2 0 002 2h0a2 2 0 002-2V9" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M12 7h4l2 3" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="18" cy="10" r="1" fill="white" opacity="0.6"/>
    <path d="M19 5l1-1M20 7h1M19 9l1 1" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,
  // Tag / price
  `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2H7a2 2 0 00-2 2v5l9.59 9.59a2 2 0 002.82 0l4.18-4.18a2 2 0 000-2.82L12 2z" stroke="white" stroke-width="1.6" stroke-linejoin="round"/>
    <circle cx="8.5" cy="8.5" r="1.5" fill="white" opacity="0.7"/>
  </svg>`,
]

const TEXT_TILES = [
  { top: 'Booked', bot: '✓',          hi: true  },
  { top: '$299',   bot: 'deposit',     hi: false },
  { top: '4.9 ★',  bot: null,          hi: false },
  { top: 'Apr 18', bot: '10:00 AM',    hi: false },
  { top: '12',     bot: 'jobs today',  hi: false },
  { top: 'Paid',   bot: '$180',        hi: true  },
  { top: '2h 30m', bot: null,          hi: false },
  { top: 'Sent ✓', bot: 'reminder',    hi: false },
  { top: 'New',    bot: 'booking',     hi: true  },
  { top: '★★★★★', bot: null,          hi: false },
  { top: '+$64',   bot: 'upsell',      hi: true  },
  { top: 'No-show', bot: 'protected',  hi: false },
]

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function lighten(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.min(255, Math.round(r * 1.55))},${Math.min(255, Math.round(g * 1.55))},${Math.min(255, Math.round(b * 1.55))})`
}

interface MosaicPanelProps {
  logoSrc?: string
}

export function MosaicPanel({ logoSrc }: MosaicPanelProps = {}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''

    Object.assign(el.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gridAutoRows: '54px',
      gap: '3px',
      gridAutoFlow: 'dense',
      padding: '3px',
      overflow: 'hidden',
      position: 'absolute',
      inset: '0',
    })

    // ── Hero tile: 2×2 with logo ────────────────────────────────
    if (logoSrc) {
      const heroTile = document.createElement('div')
      Object.assign(heroTile.style, {
        background:     '#0d2038',
        border:         '1px solid rgba(0,184,245,0.22)',
        borderRadius:   '4px',
        gridColumn:     'span 2',
        gridRow:        'span 2',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        overflow:       'hidden',
        padding:        '10px',
        boxShadow:      'inset 0 0 24px rgba(0,184,245,0.05)',
      })
      const logoImg = document.createElement('img')
      logoImg.src    = logoSrc
      logoImg.alt    = 'DetailOps'
      Object.assign(logoImg.style, {
        width:      '82%',
        maxWidth:   '140px',
        height:     'auto',
        objectFit:  'contain',
        display:    'block',
        pointerEvents: 'none',
        userSelect: 'none',
      })
      heroTile.appendChild(logoImg)
      el.appendChild(heroTile)
    }

    // Generate enough tiles to overflow and fill any panel height
    for (let i = 0; i < 80; i++) {
      const colSpan = Math.random() < 0.58 ? 1 : 2
      const rowSpan = Math.random() < 0.62 ? 1 : 2
      const bg      = pick(BG)

      const tile = document.createElement('div')
      Object.assign(tile.style, {
        background:   bg,
        border:       '1px solid rgba(0,184,245,0.12)',
        borderRadius: '4px',
        gridColumn:   `span ${colSpan}`,
        gridRow:      `span ${rowSpan}`,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        overflow:     'hidden',
        transition:   'background 0.3s ease, border-color 0.3s ease',
        position:     'relative',
        cursor:       'default',
      })

      tile.addEventListener('mouseenter', () => {
        tile.style.background    = lighten(bg)
        tile.style.borderColor   = 'rgba(0,184,245,0.3)'
      })
      tile.addEventListener('mouseleave', () => {
        tile.style.background  = bg
        tile.style.borderColor = 'rgba(0,184,245,0.12)'
      })

      // ── Content distribution ─────────────────────────────────
      const roll = Math.random()

      if (roll < 0.30) {
        // Icon tile
        const opacity = 0.12 + Math.random() * 0.10
        const size    = colSpan === 2 ? 28 : 20
        const wrapper = document.createElement('div')
        Object.assign(wrapper.style, {
          opacity:        String(opacity),
          width:          `${size}px`,
          height:         `${size}px`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          pointerEvents:  'none',
          flexShrink:     '0',
        })
        const iconSvg = pick(ICONS)
        wrapper.innerHTML = iconSvg
        const svg = wrapper.querySelector('svg')
        if (svg) { svg.setAttribute('width', `${size}`); svg.setAttribute('height', `${size}`) }
        tile.appendChild(wrapper)

      } else if (roll < 0.52) {
        // Text micro-content tile
        const item  = pick(TEXT_TILES)
        const isWide = colSpan === 2
        const wrap  = document.createElement('div')
        Object.assign(wrap.style, {
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '2px',
          pointerEvents:  'none',
          padding:        '4px 6px',
          textAlign:      'center',
        })

        const top = document.createElement('div')
        Object.assign(top.style, {
          fontSize:      isWide ? '12px' : '10px',
          fontWeight:    '700',
          color:         item.hi ? 'rgba(0,184,245,0.55)' : 'rgba(255,255,255,0.22)',
          fontFamily:    '"Plus Jakarta Sans", system-ui, sans-serif',
          letterSpacing: '0.02em',
          lineHeight:    '1.2',
          whiteSpace:    'nowrap',
        })
        top.textContent = item.top
        wrap.appendChild(top)

        if (item.bot) {
          const bot = document.createElement('div')
          Object.assign(bot.style, {
            fontSize:      '9px',
            fontWeight:    '400',
            color:         'rgba(255,255,255,0.13)',
            fontFamily:    '"Plus Jakarta Sans", system-ui, sans-serif',
            letterSpacing: '0.04em',
            lineHeight:    '1.2',
            whiteSpace:    'nowrap',
          })
          bot.textContent = item.bot
          wrap.appendChild(bot)
        }
        tile.appendChild(wrap)
      }
      // else: plain coloured tile — intentional empty space

      el.appendChild(tile)
    }

    return () => { el.innerHTML = '' }
  }, [])

  return <div ref={ref} aria-hidden />
}
