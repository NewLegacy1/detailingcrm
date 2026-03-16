import { AutomationsForm } from './automations-form'

export default function AutomationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title text-[var(--text)]">Automations</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Configure review follow-up, new booking alerts, job reminders, and maintenance upsell. Email/SMS require provider setup (e.g. Resend, Twilio).
        </p>
      </div>
      <AutomationsForm />
    </div>
  )
}
