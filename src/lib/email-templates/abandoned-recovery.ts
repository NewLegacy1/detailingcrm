/**
 * HTML email template for abandoned booking recovery.
 * Branded per org — uses the org's own colors, logo, and name.
 * DetailOps appears only as a subtle "Powered by" in the footer.
 */
export interface AbandonedRecoveryData {
  customerName: string
  resumeUrl: string
  businessName: string
  businessPhone?: string
  businessEmail?: string
  serviceArea?: string | null
  businessLogo?: string | null
  /** From organizations.primary_color */
  primaryColor?: string | null
  /** From organizations.accent_color */
  accentColor?: string | null
  /** From organizations.theme */
  theme?: string | null
  /** From organizations.booking_header_text_color */
  headerTextColor?: string | null
  detailOpsLogoUrl?: string
  discountOffer?: string
}

const DETAILOPS_LOGO_URL = 'https://detailops.vercel.app/detailopslogo.png'

export function buildAbandonedRecoveryHtml(data: AbandonedRecoveryData): string {
  const {
    customerName,
    resumeUrl,
    businessName,
    businessPhone = '',
    businessEmail = '',
    businessLogo,
    primaryColor,
    accentColor,
    theme,
    headerTextColor,
    detailOpsLogoUrl = DETAILOPS_LOGO_URL,
    discountOffer,
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
  <!-- Force light scheme so Apple Mail/iOS don't invert or adjust colors (keeps yellow accent correct) -->
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Don't Miss Out — Finish Your Booking!</title>
  <style type="text/css">
    :root {
      color-scheme: light;
      supported-color-schemes: light;
    }
  </style>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="outer-table" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
          <!-- Header: org primary color + logo/name -->
          <tr>
            <td style="background-color: ${escapeHtml(headerBg)}; padding: 28px 32px; border-radius: 12px 12px 0 0; text-align: center;">
              ${businessLogo
                ? `<img src="${escapeHtml(businessLogo)}" alt="${escapeHtml(businessName)}" height="72" class="logo-img" style="display: inline-block; max-height: 72px; max-width: 240px; object-fit: contain;" />`
                : `<span style="color: ${escapeHtml(headerText)}; font-size: 26px; font-weight: 700; letter-spacing: -0.3px;">${escapeHtml(businessName)}</span>`
              }
            </td>
          </tr>
          <!-- Banner: accent color -->
          <tr>
            <td class="accent-bg" style="background-color: ${escapeHtml(accent)}; padding: 22px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 11px; font-weight: 700; color: ${escapeHtml(headerText)}; opacity: 0.7; letter-spacing: 1.5px; text-transform: uppercase;">You Left Something Behind</p>
                    <h1 style="margin: 4px 0 0; font-size: 22px; font-weight: 700; color: ${escapeHtml(headerText)}; letter-spacing: -0.3px;">Your spot is waiting! ⏳</h1>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="font-size: 36px;">🚗</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="content-td" style="background-color: #ffffff; padding: 28px 32px;">
              <p style="margin: 0 0 24px; font-size: 15px; color: #4b5563;">
                Hi <strong>${escapeHtml(customerName)}</strong>, you were this close to booking with <strong>${escapeHtml(businessName)}</strong> — don't let that spot slip away!
              </p>
              <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 0 0 24px;" />
              <!-- What they started -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="highlight-box subtle-bg" style="margin-bottom: 24px; background: #f9fafb; border-radius: 8px; border-left: 3px solid ${escapeHtml(accent)}; overflow: hidden;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; color: ${escapeHtml(headerText)}; letter-spacing: 1px; text-transform: uppercase;">What You Started</p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #374151; line-height: 1.6;">A premium detailing session — ready for your car.</p>
                    ${discountOffer ? `<p style="margin: 0; font-size: 13px; font-weight: 700; color: #059669;">🎁 ${escapeHtml(discountOffer)}</p>` : ''}
                  </td>
                </tr>
              </table>
              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(resumeUrl)}" class="cta-button" style="display: inline-flex; align-items: center; gap: 8px; background-color: ${escapeHtml(accent)}; color: ${escapeHtml(headerText)}; text-decoration: none; font-weight: 700; font-size: 16px; padding: 16px 40px; border-radius: 8px;">
                      Finish Booking Now →
                    </a>
                  </td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 0 0 24px;" />
              <!-- Contact -->
              <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 1.2px; text-transform: uppercase;">Questions? Contact Us</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="subtle-bg" style="background: #f9fafb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 14px;">
                    <p style="margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #111827;">${escapeHtml(businessName)}</p>
                    ${businessPhone ? `<p style="margin: 0 0 2px; font-size: 13px; color: #6b7280;"><a href="tel:${escapeHtml(businessPhone)}" class="accent-text" style="color: ${escapeHtml(accent)}; text-decoration: none;">${escapeHtml(businessPhone)}</a></p>` : ''}
                    ${businessEmail ? `<p style="margin: 0; font-size: 13px; color: #6b7280;"><a href="mailto:${escapeHtml(businessEmail)}" class="accent-text" style="color: ${escapeHtml(accent)}; text-decoration: none;">${escapeHtml(businessEmail)}</a></p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="subtle-bg" style="background-color: #f9fafb; padding: 16px 32px; border-radius: 0 0 12px 12px; text-align: center; border-top: 1px solid #f3f4f6;">
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                Powered by &nbsp;<img src="${escapeHtml(detailOpsLogoUrl)}" alt="DetailOps" height="14" style="display: inline-block; vertical-align: middle; opacity: 0.4;" />
              </p>
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
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
