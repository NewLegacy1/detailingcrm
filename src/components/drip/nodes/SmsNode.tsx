'use client'

import { useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const PLACEHOLDER_HINTS = [
  '{{customerName}}',
  '{{customerEmail}}',
  '{{customerPhone}}',
  '{{trackedBookingUrl}}',
  '{{bookingUrl}}',
  '{{businessName}}',
]

export interface SmsNodeData {
  body?: string
  triggerType?: string
}

export interface SmsNodeProps {
  id: string
  data?: SmsNodeData | Record<string, unknown>
  onUpdate?: (data: SmsNodeData) => void
}

/** Flow node: compact display. When onUpdate is provided (right panel), show editor. */
export function SmsNode(props: SmsNodeProps) {
  const { id, data: rawData, onUpdate } = props
  const data = rawData as SmsNodeData | undefined
  const body = data?.body ?? ''

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate?.({ ...data, body: e.target.value })
    },
    [data, onUpdate]
  )

  if (onUpdate != null) {
    return (
      <div className="space-y-2">
        <Label htmlFor={`sms-body-${id}`} className="text-xs text-[var(--text-muted)]">
          Message
        </Label>
        <Textarea
          id={`sms-body-${id}`}
          value={body}
          onChange={handleChange}
          placeholder="Hi {{customerName}}, ..."
          rows={4}
          className="resize-none text-sm bg-[var(--bg)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]"
        />
        <p className="text-[10px] text-[var(--text-muted)]">
          Placeholders: {PLACEHOLDER_HINTS.join(', ')}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 min-w-[200px]">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold uppercase text-[var(--accent)]">Send SMS</span>
      </div>
      <p className="text-sm text-[var(--text)] line-clamp-2">{body || 'No message'}</p>
    </div>
  )
}
