/** WKWebView often reports 0 for env(safe-area-inset-top); keep a notch-friendly minimum. */
export const CAPACITOR_MIN_TOP_INSET_PX = 56

/** Use in paddingTop (or calc with extra spacing). */
export const CAPACITOR_TOP_SAFE_PADDING = `max(env(safe-area-inset-top, 0px), ${CAPACITOR_MIN_TOP_INSET_PX}px)`
