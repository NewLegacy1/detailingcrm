import Link from 'next/link'
import {
  HelpCircle,
  BookOpen,
  Mail,
  FileText,
  Shield,
  ExternalLink,
  Calendar,
  Users,
  CreditCard,
  ListChecks,
} from 'lucide-react'

const cardClass =
  'p-6 space-y-4 max-w-xl rounded-[var(--radius-lg)] border border-[var(--border)] shadow-[var(--shadow-card)]'
const cardStyle = {
  background: 'var(--accent-gradient)',
  boxShadow: 'var(--shadow-card), 0 0 0 1px rgba(255,255,255,0.06)',
}

export default function HelpAndLegalPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title text-[var(--text)]">Help & Legal</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Getting started, FAQs, support, and legal information.
        </p>
      </div>

      {/* Getting started */}
      <section className={cardClass} style={cardStyle}>
        <h2 className="section-title text-[var(--text)] flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Getting started
        </h2>
        <p className="text-[var(--text-secondary)] text-sm">
          DetailOps helps you manage jobs, customers, and bookings in one place. Here’s the basics:
        </p>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
          <li className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <strong className="text-[var(--text)]">Jobs & Schedule</strong> — Create jobs, set status (scheduled → in progress → complete), and sync with Google Calendar.
          </li>
          <li className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <strong className="text-[var(--text)]">Customers</strong> — Add customers and link vehicles. Their details appear when you open a job.
          </li>
          <li className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <strong className="text-[var(--text)]">Payments & Invoicing</strong> — Connect Stripe in Settings → Payments to send invoices and record payments.
          </li>
          <li className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <strong className="text-[var(--text)]">Booking portal</strong> — Share your booking link (Settings → Branding) so clients can book and add their vehicle and address.
          </li>
        </ul>
      </section>

      {/* FAQs */}
      <section className={cardClass} style={cardStyle}>
        <h2 className="section-title text-[var(--text)] flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          Frequently asked questions
        </h2>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-medium text-[var(--text)] mb-1">How do I add a new job?</dt>
            <dd className="text-[var(--text-secondary)]">
              From the Jobs page, click “New job”. Choose or add a customer, pick a service, set date/time and address. You can also add a vehicle for the customer there.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--text)] mb-1">How do I share my booking link with clients?</dt>
            <dd className="text-[var(--text-secondary)]">
              Go to Settings → Branding and Booking Portal. Your booking link is shown there. Share that URL so clients can pick a service, time, and enter their details and vehicle.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--text)] mb-1">How do I connect Stripe for invoices?</dt>
            <dd className="text-[var(--text-secondary)]">
              Settings → Payments & Invoicing (or Integrations). Click to connect your Stripe account. After connecting, you can send invoices and record payments from job details.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--text)] mb-1">How do I add team members?</dt>
            <dd className="text-[var(--text-secondary)]">
              Settings → Team. Invite members by email and assign roles. They’ll need to sign up or sign in with that email to access the organization.
            </dd>
          </div>
        </dl>
      </section>

      {/* Contact support */}
      <section className={cardClass} style={cardStyle}>
        <h2 className="section-title text-[var(--text)] flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Contact support
        </h2>
        <p className="text-[var(--text-secondary)] text-sm">
          Need help or have feedback? Reach out and we’ll get back to you as soon as we can.
        </p>
        <a
          href="mailto:support@detailops.com"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline"
        >
          support@detailops.com
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </section>

      {/* Legal */}
      <section className={cardClass} style={cardStyle}>
        <h2 className="section-title text-[var(--text)] flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Legal
        </h2>
        <p className="text-[var(--text-secondary)] text-sm">
          By using this app you agree to our terms and privacy policy. Links below open in the same tab.
        </p>
        <ul className="space-y-3">
          <li>
            <Link
              href="/crm/legal/terms"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline"
            >
              <FileText className="h-4 w-4 shrink-0" />
              Terms of Service
            </Link>
          </li>
          <li>
            <Link
              href="/crm/legal/privacy"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline"
            >
              <FileText className="h-4 w-4 shrink-0" />
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link
              href="/crm/legal/cookies"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline"
            >
              <FileText className="h-4 w-4 shrink-0" />
              Cookie policy
            </Link>
          </li>
        </ul>
      </section>
    </div>
  )
}
