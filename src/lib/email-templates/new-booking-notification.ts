/**
 * HTML email template for "You have a new Booking!" sent to the business when a customer books.
 *
 * businessPhone should be pulled from public.profiles.phone for the org/business owner.
 */
export interface NewBookingNotificationData {
  businessName: string
  /** Full URL to the DetailOps logo. Defaults to https://detailops.vercel.app/detailopslogo.png */
  detailOpsLogoUrl?: string
  logoUrl: string | null
  customerName: string
  serviceName: string
  scheduledAt: string
  address: string
  jobId: string
  orderId: string
  descriptionLine: string
  subTotal: string
  taxLine?: string
  taxAmount?: string
  total: string
  customerContact: string
  /**
   * Business/org phone number from public.profiles.phone
   * e.g. profile.phone where profile is the org owner's row
   */
  businessPhone?: string
  serviceAreaLabel: string
  crmJobUrl: string
  bookingTrackUrl?: string
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyAgxm86Lej6n8yvkCkpNQ55TYn8fTyembs'
const DETAILOPS_LOGO_URL = 'https://detailops.vercel.app/detailopslogo.png'
// Brand colors from the DetailOps "DO" logo
const BRAND_GRADIENT = 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)'
const BRAND_LINK_COLOR = '#0072ff'

export function buildNewBookingNotificationHtml(data: NewBookingNotificationData): string {
  const {
    businessName,
    detailOpsLogoUrl = DETAILOPS_LOGO_URL,
    customerName,
    scheduledAt,
    address,
    orderId,
    descriptionLine,
    subTotal,
    taxLine,
    taxAmount,
    total,
    customerContact,
    businessPhone,
    serviceAreaLabel,
    crmJobUrl,
    bookingTrackUrl,
  } = data

  // Apple Maps directions
  const directionsUrl = `https://maps.apple.com/?daddr=${encodeURIComponent(address)}&dirflg=d`

  // Google Static Maps (brand blue marker)
  const staticMapUrl =
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${encodeURIComponent(address)}` +
    `&zoom=14` +
    `&size=520x160` +
    `&scale=2` +
    `&markers=color:0x0072ff%7C${encodeURIComponent(address)}` +
    `&style=feature:poi|visibility:off` +
    `&key=${GOOGLE_MAPS_API_KEY}`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Force light scheme so Apple Mail/iOS don't invert or adjust colors -->
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>New Booking – DetailOps</title>
  <style type="text/css">
    :root {
      color-scheme: light;
      supported-color-schemes: light;
    }
  </style>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="outer-table" style="background-color: #0a0a0a; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
          <!-- Header: black with DetailOps logo -->
          <tr>
            <td class="dark-bg" style="background-color: #000000; padding: 28px 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <img src="${escapeHtml(detailOpsLogoUrl)}" alt="DetailOps" height="72" class="logo-img" style="display: inline-block; max-height: 72px; max-width: 240px; object-fit: contain;" />
            </td>
          </tr>
          <!-- Blue gradient banner -->
          <tr>
            <td class="accent-bg" style="background: ${BRAND_GRADIENT}; padding: 22px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.75); letter-spacing: 1.5px; text-transform: uppercase;">New Booking</p>
                    <h1 style="margin: 4px 0 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">You've got a new job! 🎉</h1>
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
                <strong>${escapeHtml(customerName)}</strong> has booked one of your services. Here's everything you need.
              </p>
              <!-- CRM button -->
              <p style="margin: 0 0 28px;">
                <a href="${escapeHtml(crmJobUrl)}" class="cta-button" style="display: inline-flex; align-items: center; gap: 8px; background: ${BRAND_GRADIENT}; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 8px;">
                  ✏️ &nbsp;View Job in CRM
                </a>
              </p>
              <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 0 0 24px;" />
              <!-- Job Details -->
              <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 1.2px; text-transform: uppercase;">Job Details</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
                    <p style="margin: 0; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px;">Scheduled</p>
                    <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #111827;">${escapeHtml(scheduledAt)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
                    <p style="margin: 0; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px;">Address</p>
                    <p style="margin: 4px 0 6px; font-size: 14px; font-weight: 600; color: #111827;">
                      <a href="${escapeHtml(directionsUrl)}" class="accent-text" style="color: ${BRAND_LINK_COLOR}; text-decoration: none;">${escapeHtml(address)}</a>
                    </p>
                    <a href="${escapeHtml(directionsUrl)}" style="display: block; border-radius: 8px; overflow: hidden; line-height: 0; border: 1px solid #e5e7eb;">
                      <img src="${escapeHtml(staticMapUrl)}" alt="Map of ${escapeHtml(address)}" width="520" height="160" style="display: block; width: 100%; height: auto; border-radius: 7px;" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; vertical-align: top;">
                    <p style="margin: 0; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px;">Order ID</p>
                    <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #111827;">#${escapeHtml(orderId)}</p>
                  </td>
                </tr>
              </table>
              <!-- Order Summary -->
              <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 1.2px; text-transform: uppercase;">Order Summary</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #374151; margin-bottom: 24px; background: #f9fafb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 10px 14px;">${escapeHtml(descriptionLine)}</td>
                  <td align="right" style="padding: 10px 14px;">${escapeHtml(subTotal)}</td>
                </tr>
                ${taxLine && taxAmount
                  ? `<tr><td style="padding: 10px 14px; color: #6b7280; border-top: 1px solid #f3f4f6;">${escapeHtml(taxLine)}</td><td align="right" style="padding: 10px 14px; color: #6b7280; border-top: 1px solid #f3f4f6;">${escapeHtml(taxAmount)}</td></tr>`
                  : ''}
                <tr style="background: #f3f4f6;">
                  <td style="padding: 12px 14px; font-weight: 700; color: #111827; border-top: 1px solid #e5e7eb;">Total</td>
                  <td align="right" style="padding: 12px 14px; font-weight: 700; color: #111827; border-top: 1px solid #e5e7eb;">${escapeHtml(total)}</td>
                </tr>
              </table>
              <!-- Customer -->
              <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 1.2px; text-transform: uppercase;">Customer</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="subtle-bg" style="margin-bottom: 24px; background: #f9fafb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 14px;">
                    <p style="margin: 0 0 4px; font-size: 14px; color: #374151;">${escapeHtml(customerContact)}</p>
                  </td>
                </tr>
              </table>
              <!-- Service Provider -->
              <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 1.2px; text-transform: uppercase;">Service Provider</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="subtle-bg" style="margin-bottom: 28px; background: #f9fafb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 14px;">
                    <p style="margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #111827;">${escapeHtml(serviceAreaLabel || businessName)}</p>
                    ${businessPhone
                      ? `<p style="margin: 0; font-size: 13px; color: #6b7280;"><a href="tel:${escapeHtml(businessPhone)}" class="accent-text" style="color: ${BRAND_LINK_COLOR}; text-decoration: none;">${escapeHtml(businessPhone)}</a></p>`
                      : ''}
                  </td>
                </tr>
              </table>
              <!-- Actions -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right: 8px;">
                    <a href="${escapeHtml(crmJobUrl)}" class="cta-button" style="display: inline-flex; align-items: center; gap: 6px; background: ${BRAND_GRADIENT}; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 24px; border-radius: 8px;">✏️ View in CRM</a>
                  </td>
                  ${bookingTrackUrl
                    ? `<td><a href="${escapeHtml(bookingTrackUrl)}" style="display: inline-flex; align-items: center; gap: 6px; background: #f3f4f6; color: #374151; text-decoration: none; font-size: 13px; font-weight: 500; padding: 12px 24px; border-radius: 8px;">✕ Cancel / Postpone</a></td>`
                    : ''}
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="dark-bg" style="background-color: #000000; padding: 20px 32px; border-radius: 0 0 12px 12px; text-align: center;">
              <img src="${escapeHtml(detailOpsLogoUrl)}" alt="DetailOps" height="40" style="display: inline-block; max-height: 40px; width: auto; object-fit: contain; margin-bottom: 10px; opacity: 0.9;" />
              <p style="margin: 0; font-size: 11px; color: #4b5563;">The CRM built for detailers · <a href="https://detailops.io" class="accent-text" style="color: #4b5563; text-decoration: none;">detailops.io</a></p>
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
