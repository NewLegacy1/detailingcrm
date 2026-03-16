/**
 * Generic HTML wrapper for drip marketing email nodes.
 * Branded per org; body is the (already variable-replaced) plain text from the workflow node.
 */
export interface DripEmailData {
  /** Main message body (plain text, will be escaped and shown with preserved newlines) */
  bodyContent: string
  businessName: string
  businessLogo?: string | null
  primaryColor?: string | null
  accentColor?: string | null
  theme?: string | null
  headerTextColor?: string | null
  detailOpsLogoUrl?: string
}

const DEFAULT_LOGO = 'https://detailops.vercel.app/detailopslogo.png'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function buildDripEmailHtml(data: DripEmailData): string {
  const {
    bodyContent,
    businessName,
    businessLogo,
    primaryColor,
    accentColor,
    theme,
    headerTextColor,
    detailOpsLogoUrl = DEFAULT_LOGO,
  } = data

  const headerBg = primaryColor || '#111827'
  const accent = accentColor || '#111827'
  const headerText = headerTextColor
    ? headerTextColor
    : theme === 'light' ? '#111827' : '#ffffff'

  const safeBody = escapeHtml(bodyContent).replace(/\n/g, '<br>\n')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style type="text/css">:root { color-scheme: light; supported-color-schemes: light; }</style>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="background-color: ${escapeHtml(headerBg)}; padding: 24px 32px; text-align: center;">
              ${businessLogo
                ? `<img src="${escapeHtml(businessLogo)}" alt="${escapeHtml(businessName)}" height="48" style="display: inline-block; max-height: 48px; max-width: 180px; object-fit: contain;" />`
                : `<span style="color: ${escapeHtml(headerText)}; font-size: 20px; font-weight: 700;">${escapeHtml(businessName)}</span>`
              }
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 28px 32px;">
              <div style="font-size: 15px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${safeBody}</div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 12px 32px; text-align: center; border-top: 1px solid #f3f4f6;">
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">Powered by <img src="${escapeHtml(detailOpsLogoUrl)}" alt="DetailOps" height="12" style="vertical-align: middle; opacity: 0.5;" /></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
