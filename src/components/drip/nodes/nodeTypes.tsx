'use client'

import type { NodeTypes, NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { SmsNode } from './SmsNode'
import { EmailNode } from './EmailNode'

function TriggerNode({ data }: NodeProps) {
  return (
    <>
      <div className="rounded-lg border-2 border-[var(--accent)] bg-[var(--surface-2)] px-4 py-2 min-w-[160px]">
        <span className="text-xs font-semibold uppercase text-[var(--accent)]">Trigger</span>
        <p className="text-sm text-[var(--text)] mt-0.5">{String((data as Record<string, unknown>)?.triggerType ?? '—').replace(/_/g, ' ')}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[var(--accent)]" />
    </>
  )
}

function WaitNode({ data }: NodeProps) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-[var(--border)]" />
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 min-w-[120px]">
        <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">Wait</span>
        <p className="text-sm text-[var(--text)] mt-0.5">{String((data as Record<string, unknown>)?.duration ?? '—')}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[var(--border)]" />
    </>
  )
}

/** EmailNode for flow canvas (no onUpdate) */
function EmailNodeFlow(props: NodeProps) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-[var(--border)]" />
      <EmailNode id={props.id} data={props.data as Record<string, unknown>} />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[var(--border)]" />
    </>
  )
}

function CheckNode({ data }: NodeProps) {
  const condition = String((data as Record<string, unknown>)?.condition ?? '—').replace(/_/g, ' ')
  const isLinkOpened = (data as Record<string, unknown>)?.condition === 'link_opened'
  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-[var(--border)]" />
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 min-w-[160px]">
        <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">Check</span>
        <p className="text-sm text-[var(--text)] mt-0.5">{condition}</p>
        {isLinkOpened && (
          <p className="text-[10px] text-[var(--text-muted)] mt-1">Tracked link from earlier step</p>
        )}
      </div>
      <div className="relative flex justify-between px-1 pt-0.5">
        <span className="text-[10px] text-[var(--text-muted)]">No</span>
        <span className="text-[10px] text-[var(--text-muted)]">Yes</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="false" className="!w-2 !h-2 !bg-[var(--border)] !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="true" className="!w-2 !h-2 !bg-[var(--border)] !left-[70%]" />
    </>
  )
}

function EndNode() {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-[var(--border)]" />
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 min-w-[80px]">
        <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">End</span>
      </div>
    </>
  )
}

/** SmsNode for flow canvas (no onUpdate) */
function SmsNodeFlow(props: NodeProps) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-[var(--border)]" />
      <SmsNode id={props.id} data={props.data as Record<string, unknown>} />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[var(--border)]" />
    </>
  )
}

export const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  wait: WaitNode,
  sms: SmsNodeFlow,
  email: EmailNodeFlow,
  check: CheckNode,
  end: EndNode,
}
