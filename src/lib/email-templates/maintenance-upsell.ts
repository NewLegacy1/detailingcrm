/**
 * HTML email template for maintenance follow-up ("Time for your next detail?").
 * Branded per org — uses org colors, logo, and name.
 */
export interface MaintenanceUpsellData {
  customerName: string
  maintenanceUrl: string
  businessName: string
  businessPhone?: string
  businessEmail?: string
  businessLogo?: string | null
  primaryColor?: string | null
  accentColor?: string | null
  theme?: string | null
  headerTextColor?: string | null
  detailOpsLogoUrl?: string
  /** e.g. "10% off" or "$20 off" — can be empty */
  discountText?: string
}

const DEFAULT_LOGO = 'https://detailops.vercel.app/detailopslogo.png'

export function buildMaintenanceUpsellHtml(data: MaintenanceUpsellData): string {
  const {
    customerName,
    maintenanceUrl,
    businessName,
    businessPhone = '',
    businessEmail = '',
    businessLogo,
    primaryColor,
    accentColor,
    theme,
    headerTextColor,
    detailOpsLogoUrl = DEFAULT_LOGO,
    discountText = '',
  } = data

  const headerBg = primaryColor || '#111827'
  const accent = accentColor || '#111827'
  const headerText = headerTextColor
    ? headerTextColor
    : theme === 'light' ? '#111827' : '#ffffff'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Time for your next detail?</title>
  <style type="text/css">:root { color-scheme: light; supported-color-schemes: light; }</style>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="background-color: ${escapeHtml(headerBg)}; padding: 28px 32px; text-align: center;">
              ${businessLogo
                ? `<img src="${escapeHtml(businessLogo)}" alt="${escapeHtml(businessName)}" height="56" style="display: inline-block; max-height: 56px; max-width: 200px; object-fit: contain;" />`
                : `<span style="color: ${escapeHtml(headerText)}; font-size: 22px; font-weight: 700;">${escapeHtml(businessName)}</span>`
              }
            </td>
          </tr>
          <tr>
            <td style="background-color: ${escapeHtml(accent)}; padding: 20px 32px;">
              <p style="margin: 0; font-size: 11px; font-weight: 700; color: ${escapeHtml(headerText)}; opacity: 0.85; letter-spacing: 1.2px; text-transform: uppercase;">We miss your car</p>
              <h1 style="margin: 4px 0 0; font-size: 20px; font-weight: 700; color: ${escapeHtml(headerText)};">Time for a refresh? ✨</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 28px 32px;">
              <p style="margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.6;">
                Hi <strong>${escapeHtml(customerName)}</strong>, keep that just-detailed look going. <strong>${escapeHtml(businessName)}</strong> is here when you're ready for your next visit.
              </p>
              ${discountText ? `<p style="margin: 0 0 16px; font-size: 14px; font-weight: 700; color: #059669;">🎁 ${escapeHtml(discountText)} on your next booking when you use the link below.</p>` : ''}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(maintenanceUrl)}" style="display: inline-block; background-color: ${escapeHtml(accent)}; color: ${escapeHtml(headerText)}; text-decoration: none; font-weight: 700; font-size: 16px; padding: 14px 32px; border-radius: 8px;">Book your next detail</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">We'd love to see you again.</p>
              ${(businessPhone || businessEmail) ? `
              <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af;">Questions? ${businessPhone ? `<a href="tel:${escapeHtml(businessPhone)}" style="color: ${escapeHtml(accent)};">${escapeHtml(businessPhone)}</a>` : ''} ${businessEmail ? `<a href="mailto:${escapeHtml(businessEmail)}" style="color: ${escapeHtml(accent)};">${escapeHtml(businessEmail)}</a>` : ''}</p>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 14px 32px; text-align: center; border-top: 1px solid #f3f4f6;">
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
