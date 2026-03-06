/**
 * HTML email template for clients: "Your Detailing Appointment is Confirmed!"
 * Fully branded per org — uses the org's own colors, logo, and name.
 * DetailOps appears only as a subtle "Powered by" in the footer.
 */
export interface ClientConfirmationData {
  customerName: string
  serviceName: string
  scheduledAt: string // e.g. "Friday, March 13 at 2:30 PM"
  address: string
  businessName: string
  businessPhone: string // from public.profiles.phone
  businessEmail: string
  serviceArea?: string | null
  /** Org's logo URL */
  businessLogo?: string | null
  /** From organizations.primary_color — used for header background. Default #111827 */
  primaryColor?: string | null
  /** From organizations.accent_color — used for buttons, links, accents. Default #111827 */
  accentColor?: string | null
  /** From organizations.theme — 'dark' | 'light'. Controls header text color. Default 'dark' */
  theme?: string | null
  /** From organizations.booking_header_text_color — overrides auto header text color if set */
  headerTextColor?: string | null
  detailOpsLogoUrl?: string
  prepTips?: string
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyAgxm86Lej6n8yvkCkpNQ55TYn8fTyembs'
const DETAILOPS_LOGO_URL = 'https://detailops.vercel.app/detailopslogo.png'

export function buildClientConfirmationHtml(data: ClientConfirmationData): string {
  const {
    customerName,
    serviceName,
    scheduledAt,
    address,
    businessName,
    businessPhone,
    businessEmail,
    businessLogo,
    primaryColor,
    accentColor,
    theme,
    headerTextColor,
    detailOpsLogoUrl = DETAILOPS_LOGO_URL,
    prepTips = "Please make sure your vehicle is accessible and unlocked. We bring all supplies — just sit back and let us make it shine!",
  } = data

  // Resolve brand colors
  const headerBg = primaryColor || '#111827'
  const accent = accentColor || '#111827'

  // Header text: explicit override → theme-based → auto-contrast fallback
  const headerText = headerTextColor
    ? headerTextColor
    : theme === 'light' ? '#111827' : '#ffffff'

  // For links/accents on white background, ensure accent isn't too light
  const accentForText = accent  // You can add logic here later to darken if needed (e.g., if hex is very light)

  // Apple Maps directions — opens native Maps app on iOS
  const directionsUrl = `https://maps.apple.com/?daddr=${encodeURIComponent(address)}&dirflg=d`

  // Google Static Maps — marker uses accent color (strip #)
  const markerColor = accent.replace('#', '')
  const staticMapUrl =
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${encodeURIComponent(address)}` +
    `&zoom=14` +
    `&size=520x180` +
    `&scale=2` +
    `&markers=color:0x${markerColor}%7C${encodeURIComponent(address)}` +
    `&style=feature:poi|visibility:off` +
    `&key=${GOOGLE_MAPS_API_KEY}`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Force light scheme so Apple Mail/iOS don't invert or adjust colors (keeps yellow accent correct) -->
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Your Appointment is Confirmed!</title>
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
          <!-- Confirmation banner: accent color -->
          <tr>
            <td class="accent-bg" style="background-color: ${escapeHtml(accent)}; padding: 22px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 11px; font-weight: 700; color: ${escapeHtml(headerText)}; opacity: 0.7; letter-spacing: 1.5px; text-transform: uppercase;">Booking Confirmed</p>
                    <h1 style="margin: 4px 0 0; font-size: 22px; font-weight: 700; color: ${escapeHtml(headerText)}; letter-spacing: -0.3px;">You're all booked! ✅</h1>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="font-size: 36px;">✨</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="content-td" style="background-color: #ffffff; padding: 28px 32px;">
              <p style="margin: 0 0 24px; font-size: 15px; color: #4b5563;">
                Hi <strong>${escapeHtml(customerName)}</strong>, your appointment with <strong>${escapeHtml(businessName)}</strong> is confirmed. We'll see you then!
              </p>
              <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 0 0 24px;" />
              <!-- Appointment Details -->
              <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 1.2px; text-transform: uppercase;">Appointment Details</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
                    <p style="margin: 0; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px;">Service</p>
                    <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #111827;">${escapeHtml(serviceName)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
                    <p style="margin: 0; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px;">When</p>
                    <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #111827;">${escapeHtml(scheduledAt)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; vertical-align: top;">
                    <p style="margin: 0; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px;">Where</p>
                    <p style="margin: 4px 0 6px; font-size: 14px; font-weight: 600; color: #111827;">
                      <a href="${escapeHtml(directionsUrl)}" class="accent-text" style="color: ${escapeHtml(accentForText)}; text-decoration: none;">${escapeHtml(address)}</a>
                    </p>
                    <!-- Static map — tap opens Apple Maps directions -->
                    <a href="${escapeHtml(directionsUrl)}" style="display: block; border-radius: 8px; overflow: hidden; line-height: 0; border: 1px solid #e5e7eb;">
                      <img src="${escapeHtml(staticMapUrl)}" alt="Map of ${escapeHtml(address)}" width="520" height="180" style="display: block; width: 100%; height: auto; border-radius: 7px;" />
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Prep Tips -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="prep-box subtle-bg" style="margin-bottom: 24px; background: #f9fafb; border-radius: 8px; border-left: 3px solid ${escapeHtml(accent)}; overflow: hidden;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; color: ${escapeHtml(accentForText)}; letter-spacing: 1px; text-transform: uppercase;">Before We Arrive</p>
                    <p style="margin: 0; font-size: 13px; color: #374151; line-height: 1.6;">${escapeHtml(prepTips)}</p>
                  </td>
                </tr>
              </table>
              <!-- Contact -->
              <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 1.2px; text-transform: uppercase;">Questions? Contact Us</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="subtle-bg" style="margin-bottom: 28px; background: #f9fafb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 14px;">
                    <p style="margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #111827;">${escapeHtml(businessName)}</p>
                    ${businessPhone ? `<p style="margin: 0 0 2px; font-size: 13px; color: #6b7280;"><a href="tel:${escapeHtml(businessPhone)}" class="accent-text" style="color: ${escapeHtml(accentForText)}; text-decoration: none;">${escapeHtml(businessPhone)}</a></p>` : ''}
                    ${businessEmail ? `<p style="margin: 0; font-size: 13px; color: #6b7280;"><a href="mailto:${escapeHtml(businessEmail)}" class="accent-text" style="color: ${escapeHtml(accentForText)}; text-decoration: none;">${escapeHtml(businessEmail)}</a></p>` : ''}
                  </td>
                </tr>
              </table>
              <!-- Get Directions CTA — org accent color -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(directionsUrl)}" class="cta-button" style="display: inline-flex; align-items: center; gap: 8px; background-color: ${escapeHtml(accent)}; color: ${escapeHtml(headerText)}; text-decoration: none; font-weight: 700; font-size: 14px; padding: 13px 28px; border-radius: 8px;">
                      📍 &nbsp;Get Directions
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer: subtle "Powered by DetailOps" -->
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
