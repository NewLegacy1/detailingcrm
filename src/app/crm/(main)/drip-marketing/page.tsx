'use client'

import { useState, useCallback, useEffect } from 'react'
import { Droplet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { EmailNode, type EmailNodeData } from '@/components/drip/nodes/EmailNode'
import { nodeTypes } from '@/components/drip/nodes/nodeTypes'
import { Label } from '@/components/ui/label'

const DRIP_TRIGGER_TYPES = [
  'job_paid',
  'new_booking',
  'abandoned_booking',
  'job_completed',
  'appointment_reminder',
] as const

const WAIT_DURATIONS = ['15m', '30m', '1h', '4h', '1d', '4d', '7d'] as const
const CHECK_CONDITIONS = ['booking_completed', 'link_opened'] as const

export type DripTriggerType = (typeof DRIP_TRIGGER_TYPES)[number]

export interface DripCampaign {
  id: string
  org_id: string
  name: string
  trigger_type: DripTriggerType
  workflow_json: { nodes: Node[]; edges: Edge[] }
  active: boolean
  created_at: string
  updated_at: string
}

const initialNodes: Node[] = [
  { id: 'trigger', type: 'trigger', position: { x: 200, y: 50 }, data: { triggerType: 'abandoned_booking' } },
]
const initialEdges: Edge[] = []

export default function DripMarketingPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [testRunOpen, setTestRunOpen] = useState(false)
  const [testRunClients, setTestRunClients] = useState<{ id: string; name: string; email: string | null; phone: string | null }[]>([])
  const [testRunClientId, setTestRunClientId] = useState('')
  const [testRunLoading, setTestRunLoading] = useState(false)
  const [testRunMessage, setTestRunMessage] = useState<string | null>(null)
  const [bookingSlug, setBookingSlug] = useState<string | null>(null)
  const [campaignActive, setCampaignActive] = useState<boolean>(true)
  const [campaignName, setCampaignName] = useState<string | null>(null)
  const [togglingActive, setTogglingActive] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState('')
  const [creatingCampaign, setCreatingCampaign] = useState(false)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])
  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])
  const onPaneClick = useCallback(() => setSelectedNode(null), [])

  const updateNodeData = useCallback((nodeId: string, dataUpdate: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...(n.data as Record<string, unknown>), ...dataUpdate } } : n))
    )
  }, [setNodes])

  const editingNode = selectedNode ? nodes.find((n) => n.id === selectedNode.id) ?? selectedNode : null

  useEffect(() => {
    fetch('/api/settings/organization')
      .then((r) => r.json())
      .then((org: { booking_slug?: string | null }) => setBookingSlug(org?.booking_slug ?? null))
      .catch(() => setBookingSlug(null))
  }, [])

  const openTestRunDialog = useCallback(() => {
    setTestRunMessage(null)
    setTestRunClientId('')
    setTestRunOpen(true)
    fetch('/api/drip/clients')
      .then((r) => r.json())
      .then((data) => setTestRunClients(Array.isArray(data) ? data : []))
      .catch(() => setTestRunClients([]))
  }, [])

  async function createTestRun() {
    if (!testRunClientId || !campaignId) return
    setTestRunLoading(true)
    setTestRunMessage(null)
    try {
      const res = await fetch('/api/drip/test-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: testRunClientId, campaign_id: campaignId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setTestRunMessage(data.message ?? 'Test run created. Trigger the drip cron (or wait for the next run) to send the message.')
    } catch (e) {
      setTestRunMessage(e instanceof Error ? e.message : 'Failed to create test run')
    } finally {
      setTestRunLoading(false)
    }
  }

  async function toggleCampaignActive() {
    if (!campaignId || togglingActive) return
    const next = !campaignActive
    setTogglingActive(true)
    try {
      const res = await fetch(`/api/drip/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to update')
      setCampaignActive(next)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update campaign')
    } finally {
      setTogglingActive(false)
    }
  }

  function getTriggerTypeFromWorkflow(): DripTriggerType {
    const triggerNode = nodes.find((n) => n.type === 'trigger')
    const triggerType = (triggerNode?.data as { triggerType?: string })?.triggerType
    return DRIP_TRIGGER_TYPES.includes(triggerType as DripTriggerType) ? (triggerType as DripTriggerType) : 'abandoned_booking'
  }

  async function createCampaignAndSave() {
    const name = newCampaignName.trim()
    if (!name) {
      alert('Enter a campaign name')
      return
    }
    setCreatingCampaign(true)
    try {
      const triggerType = getTriggerTypeFromWorkflow()
      const res = await fetch('/api/drip/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          trigger_type: triggerType,
          workflow_json: { nodes, edges },
        }),
      })
      const data = (await res.json()) as DripCampaign & { error?: string; existing_id?: string }
      if (!res.ok) {
        if (res.status === 409 && data.existing_id) {
          setCampaignId(data.existing_id)
          const listRes = await fetch('/api/drip/campaigns')
          const list = (await listRes.json()) as DripCampaign[]
          const existing = Array.isArray(list) ? list.find((c) => c.id === data.existing_id) : null
          if (existing) {
            setCampaignName(existing.name ?? null)
            setCampaignActive(existing.active ?? true)
            setNodes(existing.workflow_json?.nodes ?? nodes)
            setEdges(existing.workflow_json?.edges ?? edges)
          }
          setNewCampaignName('')
          return
        }
        throw new Error(data.error ?? 'Failed to create campaign')
      }
      setCampaignId(data.id)
      setCampaignName(data.name ?? null)
      setCampaignActive(data.active ?? true)
      setNewCampaignName('')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Failed to create campaign')
    } finally {
      setCreatingCampaign(false)
    }
  }

  async function saveWorkflow() {
    if (!campaignId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/drip/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_json: { nodes, edges } }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to save')
      }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8" style={{ background: 'var(--bg)' }}>
      <div>
        <h1 className="page-title flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
          <Droplet className="h-7 w-7 text-[var(--accent)]" />
          Drip Marketing
        </h1>
        <p className="mt-1 text-base" style={{ color: 'var(--text-2)' }}>
          Build automations with the canvas below. Name your campaign and click Create to save; after that, click Save to save workflow changes.
        </p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[420px]">
          {/* Left sidebar: draggable node types */}
          <div
            className="w-52 shrink-0 rounded-lg border border-[var(--border)] p-3 space-y-2"
            style={{ background: 'var(--surface-1)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Add node</p>
            {(['trigger', 'wait', 'sms', 'email', 'check', 'end'] as const).map((type) => {
              const isSmsComingSoon = type === 'sms'
              return (
                <div
                  key={type}
                  draggable={!isSmsComingSoon}
                  onDragStart={(e) => {
                    if (isSmsComingSoon) return
                    e.dataTransfer.setData('application/reactflow', type)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  className={`flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm ${isSmsComingSoon ? 'cursor-default opacity-70 text-[var(--text-muted)]' : 'cursor-grab text-[var(--text)] hover:bg-white/5'}`}
                >
                  <span>{type === 'sms' ? 'SMS (coming soon)' : type.charAt(0).toUpperCase() + type.slice(1)}</span>
                </div>
              )
            })}
          </div>

          {/* React Flow canvas */}
          <div className="flex-1 rounded-lg border border-[var(--border)] overflow-hidden" style={{ background: 'var(--surface-1)' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              nodeDragThreshold={8}
              onDrop={(e) => {
                e.preventDefault()
                const type = e.dataTransfer.getData('application/reactflow') as string
                if (!type) return
                const rect = (e.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect()
                const position = { x: e.clientX - (rect?.left ?? 0) - 100, y: e.clientY - (rect?.top ?? 0) - 25 }
                const id = `${type}-${Date.now()}`
                setNodes((nds) => nds.concat({ id, type: type as Node['type'], position, data: { triggerType: type === 'trigger' ? 'abandoned_booking' : undefined } }))
              }}
              onDragOver={(e) => e.preventDefault()}
              fitView
              className="bg-[var(--surface-1)]"
            >
              <Background color="var(--border)" gap={16} />
              <Controls className="!bottom-4 !left-4" />
              <MiniMap className="!bg-[var(--surface-2)]" />
            </ReactFlow>
          </div>

          {/* Right panel: selected node editor */}
          <div
            className="w-72 shrink-0 rounded-lg border border-[var(--border)] p-4 overflow-auto"
            style={{ background: 'var(--surface-1)' }}
          >
            {editingNode ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                  Edit: {editingNode.type}
                </p>
                {editingNode.type === 'sms' && (
                  <p className="text-sm text-[var(--text-muted)]">SMS nodes: coming soon.</p>
                )}
                {editingNode.type === 'wait' && (
                  <div className="space-y-2">
                    <Label htmlFor={`wait-duration-${editingNode.id}`} className="text-xs text-[var(--text-muted)]">
                      Duration
                    </Label>
                    <select
                      id={`wait-duration-${editingNode.id}`}
                      value={String((editingNode.data as { duration?: string })?.duration ?? '1d')}
                      onChange={(e) => updateNodeData(editingNode.id, { duration: e.target.value })}
                      className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
                    >
                      {WAIT_DURATIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {editingNode.type === 'check' && (
                  <div className="space-y-2">
                    <Label htmlFor={`check-condition-${editingNode.id}`} className="text-xs text-[var(--text-muted)]">
                      Condition
                    </Label>
                    <select
                      id={`check-condition-${editingNode.id}`}
                      value={String((editingNode.data as { condition?: string })?.condition ?? 'booking_completed')}
                      onChange={(e) => updateNodeData(editingNode.id, { condition: e.target.value })}
                      className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
                    >
                      {CHECK_CONDITIONS.map((c) => (
                        <option key={c} value={c}>
                          {c.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                    {(editingNode.data as { condition?: string })?.condition === 'link_opened' && (
                      <p className="text-xs text-[var(--text-muted)]">
                        Checks if the recipient opened the tracked booking link. Add <code className="text-[var(--accent)]">{'{{trackedBookingUrl}}'}</code> in a previous email or SMS step to create that link; the run stores it and checks here.
                      </p>
                    )}
                  </div>
                )}
                {editingNode.type === 'trigger' && (
                  <div className="space-y-2">
                    <Label htmlFor={`trigger-type-${editingNode.id}`} className="text-xs text-[var(--text-muted)]">
                      Trigger
                    </Label>
                    <select
                      id={`trigger-type-${editingNode.id}`}
                      value={String((editingNode.data as { triggerType?: string })?.triggerType ?? 'abandoned_booking')}
                      onChange={(e) => updateNodeData(editingNode.id, { triggerType: e.target.value })}
                      className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
                    >
                      {DRIP_TRIGGER_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {editingNode.type === 'email' && (
                  <EmailNode
                    id={editingNode.id}
                    data={editingNode.data as EmailNodeData}
                    onUpdate={(data) => updateNodeData(editingNode.id, data as Record<string, unknown>)}
                    bookingSlug={bookingSlug}
                  />
                )}
                {editingNode.type === 'end' && (
                  <p className="text-sm text-[var(--text-muted)]">No configuration needed. This step ends the sequence.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Click or double-click a node to edit. Changes are saved when you click Save.</p>
            )}
          </div>
        </div>

      {!campaignId && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-[var(--border)]" style={{ background: 'var(--surface-1)' }}>
          <span className="text-sm" style={{ color: 'var(--text-2)' }}>Name your campaign and save to go live:</span>
          <input
            type="text"
            placeholder="e.g. Abandoned booking follow-up"
            value={newCampaignName}
            onChange={(e) => setNewCampaignName(e.target.value)}
            className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm min-w-[200px]"
            style={{ color: 'var(--text-1)' }}
          />
          <Button onClick={createCampaignAndSave} disabled={creatingCampaign} style={{ background: 'var(--accent)', color: '#000' }}>
            {creatingCampaign ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : 'Create campaign & save'}
          </Button>
        </div>
      )}
      {campaignId && (
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            {campaignName && (
              <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{campaignName}</span>
            )}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={campaignActive}
                onChange={toggleCampaignActive}
                disabled={togglingActive}
                className="h-4 w-4 rounded border-2 border-[var(--border)] accent-[var(--accent)]"
              />
              <span className="text-sm" style={{ color: 'var(--text-2)' }}>
                {togglingActive ? 'Updating…' : campaignActive ? 'Campaign on' : 'Campaign off'}
              </span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            {saveSuccess && <span className="text-sm text-[var(--accent)]">Saved. Automation will use this workflow.</span>}
            <Button type="button" variant="outline" onClick={openTestRunDialog}>
              Test run
            </Button>
            <Button onClick={saveWorkflow} disabled={saving} style={{ background: 'var(--accent)', color: '#000' }}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : 'Save'}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={testRunOpen} onOpenChange={setTestRunOpen}>
        <DialogContent>
          <DialogClose onClick={() => setTestRunOpen(false)} />
          <DialogHeader>
            <DialogTitle>Test workflow run</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-muted)]">
            Create a one-off run for a client. The next drip cron tick will send the first message (email; SMS coming soon) to them. Use a client with your email to receive it.
          </p>
          <div className="space-y-2">
            <Label htmlFor="test-run-client" className="text-xs text-[var(--text-muted)]">Send to client</Label>
            <select
              id="test-run-client"
              value={testRunClientId}
              onChange={(e) => setTestRunClientId(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
            >
              <option value="">Select a client</option>
              {testRunClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.email ? `(${c.email})` : ''} {c.phone ? `— ${c.phone}` : ''}
                </option>
              ))}
            </select>
          </div>
          {testRunMessage && <p className="text-sm text-[var(--text)]">{testRunMessage}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setTestRunOpen(false)}>Cancel</Button>
            <Button type="button" onClick={createTestRun} disabled={testRunLoading || !testRunClientId}>
              {testRunLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : 'Create test run'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
