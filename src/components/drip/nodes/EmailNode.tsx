'use client'

import { useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

const PLACEHOLDER_HINTS = [
  '{{customerName}}',
  '{{customerEmail}}',
  '{{customerPhone}}',
  '{{trackedBookingUrl}}',
  '{{bookingUrl}}',
  '{{businessName}}',
]

/** Domain used for from-address hint (slug@domain). Same as NOTIFICATION_EMAIL_DOMAIN on server. */
const FROM_DOMAIN_HINT = 'contact.newlegacyai.ca'

export interface EmailNodeData {
  subject?: string
  body?: string
}

export interface EmailNodeProps {
  id: string
  data?: EmailNodeData | Record<string, unknown>
  onUpdate?: (data: EmailNodeData) => void
  /** Optional booking slug to show actual from address (e.g. my-business@contact.newlegacyai.ca) */
  bookingSlug?: string | null
}

/** Flow node: compact display. When onUpdate is provided (right panel), show editor. */
export function EmailNode(props: EmailNodeProps) {
  const { id, data: rawData, onUpdate, bookingSlug } = props
  const data = rawData as EmailNodeData | undefined
  const subject = data?.subject ?? ''
  const body = data?.body ?? ''

  const handleSubjectChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate?.({ ...data, subject: e.target.value })
    },
    [data, onUpdate]
  )
  const handleBodyChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate?.({ ...data, body: e.target.value })
    },
    [data, onUpdate]
  )

  const fromHint =
    bookingSlug?.trim() ?
      `${bookingSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}@${FROM_DOMAIN_HINT}`
    : `[your booking slug]@${FROM_DOMAIN_HINT}`

  if (onUpdate != null) {
    return (
      <div className="space-y-3">
        <div>
          <Label htmlFor={`email-subject-${id}`} className="text-xs text-[var(--text-muted)]">
            Subject
          </Label>
          <Input
            id={`email-subject-${id}`}
            value={subject}
            onChange={handleSubjectChange}
            placeholder="e.g. Complete your booking — {{businessName}}"
            className="mt-1 text-sm bg-[var(--bg)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]"
          />
        </div>
        <div>
          <Label htmlFor={`email-body-${id}`} className="text-xs text-[var(--text-muted)]">
            Message
          </Label>
          <Textarea
            id={`email-body-${id}`}
            value={body}
            onChange={handleBodyChange}
            placeholder="Hi {{customerName}}, ..."
            rows={5}
            className="mt-1 resize-none text-sm bg-[var(--bg)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]"
          />
        </div>
        <p className="text-[10px] text-[var(--text-muted)]">
          Placeholders: {PLACEHOLDER_HINTS.join(', ')}
        </p>
        <p className="text-[10px] text-[var(--text-muted)]">
          From: {fromHint}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 min-w-[200px]">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold uppercase text-[var(--accent)]">Send Email</span>
      </div>
      <p className="text-sm font-medium text-[var(--text)] line-clamp-1">{subject || 'No subject'}</p>
      <p className="text-sm text-[var(--text-muted)] line-clamp-2 mt-0.5">{body || 'No message'}</p>
    </div>
  )
}
