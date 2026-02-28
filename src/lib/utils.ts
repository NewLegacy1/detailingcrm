export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

/** Parse hex (#rgb or #rrggbb) to r,g,b 0-255. Returns null if invalid. */
function parseHex(hex: string): [number, number, number] | null {
  const m = hex.replace(/^#/, '').match(/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (!m) return null
  const s = m[1]
  if (s.length === 3) {
    return [
      parseInt(s[0] + s[0], 16),
      parseInt(s[1] + s[1], 16),
      parseInt(s[2] + s[2], 16),
    ]
  }
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ]
}

/** Return rgba(r, g, b, alpha) string from hex. Invalid hex returns fallback. */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return `rgba(59, 130, 246, ${alpha})`
  const [r, g, b] = rgb
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Return a slightly lighter hex colour (blend toward white). amount 0–1 = how much to blend (default 0.12). */
export function lightenHex(hex: string, amount = 0.12): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const [r, g, b] = rgb
  const R = Math.min(255, Math.round(r * (1 - amount) + 255 * amount))
  const G = Math.min(255, Math.round(g * (1 - amount) + 255 * amount))
  const B = Math.min(255, Math.round(b * (1 - amount) + 255 * amount))
  return `#${R.toString(16).padStart(2, '0')}${G.toString(16).padStart(2, '0')}${B.toString(16).padStart(2, '0')}`
}

/** Return a slightly darker hex colour (blend toward black). amount 0–1 = how much to blend. */
export function darkenHex(hex: string, amount = 0.2): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const [r, g, b] = rgb
  const R = Math.max(0, Math.round(r * (1 - amount)))
  const G = Math.max(0, Math.round(g * (1 - amount)))
  const B = Math.max(0, Math.round(b * (1 - amount)))
  return `#${R.toString(16).padStart(2, '0')}${G.toString(16).padStart(2, '0')}${B.toString(16).padStart(2, '0')}`
}

/** Relative luminance (0–1) for a hex colour. */
function luminance(hex: string): number {
  const rgb = parseHex(hex)
  if (!rgb) return 0
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** True when hex background is light (luminance > 0.5). Use for text/surface presets. */
export function isLightBackground(hex: string): boolean {
  const rgb = parseHex(hex)
  if (!rgb) return false
  const [r, g, b] = rgb.map((c) => c / 255)
  const L = 0.299 * r + 0.587 * g + 0.114 * b
  return L > 0.5
}

/** Subtext colour from background: same palette, readable. Dark bg → lighter tint; light bg → darker shade. */
export function subtextColorFromBg(bg: string): string {
  const L = luminance(bg)
  if (L > 0.5) {
    return darkenHex(bg, 0.45)
  }
  return lightenHex(bg, 0.42)
}

/** Slightly less muted than subtext (for --text-2 / secondary). */
export function secondaryTextColorFromBg(bg: string): string {
  const L = luminance(bg)
  if (L > 0.5) {
    return darkenHex(bg, 0.32)
  }
  return lightenHex(bg, 0.28)
}

/** Return a 4-step surface scale from a background hex (slightly lighter each step; tuned to be a bit less light for custom CRM backgrounds). */
export function surfaceScaleFromBg(bg: string): { surface1: string; surface2: string; surface3: string; surface4: string } {
  return {
    surface1: lightenHex(bg, 0.06),
    surface2: lightenHex(bg, 0.12),
    surface3: lightenHex(bg, 0.18),
    surface4: lightenHex(bg, 0.24),
  }
}
