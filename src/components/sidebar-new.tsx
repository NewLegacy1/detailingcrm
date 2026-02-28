'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useEffect, useState } from 'react'
import { getNavGroupsForRole } from '@/lib/nav-config'
import { crmPath } from '@/lib/crm-path'
import type { UserRole } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronDown,
  Plus,
  ClipboardList,
  Users,
  Wrench,
  FileText,
  LayoutDashboard,
  Calendar,
  Zap,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
  X,
  Menu,
} from 'lucide-react'

interface SidebarNewProps {
  role: UserRole
  fullName?: string | null
  userRole?: string | null
  avatarUrl?: string | null
  jobCount?: number
  invoiceCount?: number
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
  subscriptionPlan?: 'starter' | 'pro' | null
}

export function SidebarNew({
  role,
  fullName,
  userRole,
  avatarUrl,
  jobCount = 0,
  invoiceCount = 0,
  mobileOpen = false,
  onMobileOpenChange,
  subscriptionPlan,
}: SidebarNewProps) {
  const pathname = usePathname()
  const [createOpen, setCreateOpen] = useState(false)
  const createRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!createOpen) return
    function handleClick(e: MouseEvent) {
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [createOpen])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const groups = getNavGroupsForRole(role)
  const initials = (fullName ?? 'User').split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <>
      <style>{`
        .sidebar-new-wrap {
          position: relative;
          overflow: hidden;
        }
        .sidebar-new-wrap::before {
          content: '';
          position: absolute;
          top: -60px;
          left: -60px;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, var(--accent-dim, rgba(0,184,245,0.12)) 0%, transparent 70%);
          pointer-events: none;
        }
        .sidebar-new-wrap::after {
          content: '';
          position: absolute;
          bottom: 80px;
          right: -40px;
          width: 160px;
          height: 160px;
          background: radial-gradient(circle, var(--accent-dim, rgba(0,184,245,0.07)) 0%, transparent 70%);
          pointer-events: none;
        }
        .sidebar-scan-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent, #00b8f5) 30%, transparent), transparent);
          animation: sidebar-scan 4s ease-in-out infinite;
          pointer-events: none;
          z-index: 1;
        }
        @keyframes sidebar-scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .sidebar-section-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.62rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text-3);
          margin-bottom: 8px;
          padding-left: 12px;
        }
        .sidebar-section-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .sidebar-nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          margin-bottom: 2px;
          border-radius: 7px;
          border: 1px solid transparent;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.15s ease;
          position: relative;
          color: var(--text-2);
        }
        .sidebar-nav-link.active {
          background: var(--accent-dim, rgba(0,184,245,0.12));
          border-color: color-mix(in srgb, var(--accent, #00b8f5) 25%, transparent);
          color: var(--text-1);
        }
        .sidebar-nav-link.active .sidebar-nav-icon { color: var(--accent, #00b8f5); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--accent, #00b8f5) 80%, transparent)); }
        .sidebar-nav-link:not(.active):hover {
          background: var(--border);
          border-color: var(--border-hi);
          color: var(--text-1);
        }
        .sidebar-nav-link .sidebar-active-bar {
          position: absolute;
          left: -12px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: var(--accent, #00b8f5);
          border-radius: 0 3px 3px 0;
          box-shadow: 0 0 8px color-mix(in srgb, var(--accent, #00b8f5) 70%, transparent);
        }
        .sidebar-badge {
          background: var(--accent-dim, rgba(0,184,245,0.2));
          border: 1px solid color-mix(in srgb, var(--accent, #00b8f5) 40%, transparent);
          color: var(--accent, #00b8f5);
          font-size: 10px;
          font-weight: 500;
          padding: 1px 6px;
          border-radius: 4px;
          letter-spacing: 0.05em;
          box-shadow: 0 0 10px var(--accent-dim, rgba(0,184,245,0.2));
        }
        .sidebar-user-avatar {
          width: 30px;
          height: 30px;
          border-radius: 7px;
          background: linear-gradient(135deg, var(--accent, #00b8f5), color-mix(in srgb, var(--accent, #00b8f5) 85%, #06b6d4));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 0 12px color-mix(in srgb, var(--accent, #00b8f5) 30%, transparent);
        }
        .sidebar-signout-btn:hover .sidebar-signout-label { color: rgba(239,68,68,0.9); }
      `}</style>
      {/* Mobile overlay */}
      {onMobileOpenChange && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            background: 'rgba(0,0,0,0.6)',
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? 'auto' : 'none',
          }}
          onClick={() => onMobileOpenChange(false)}
          aria-hidden
        />
      )}
      <aside
        className={`sidebar-new-wrap ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 224,
          background: 'var(--surface-1)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
        }}
      >
        <div className="sidebar-scan-line" />
        {/* Accent glow on right edge */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 1,
            background: 'linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--accent, #00b8f5) 35%, transparent) 40%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />
        <div className="sidebar-nav-scroll" style={{ padding: '16px 12px 0', flex: '1 1 auto', overflowY: 'auto', minHeight: 0, position: 'relative', zIndex: 2 }}>
          {/* Logo – use company logo from settings when set */}
          <Link href={crmPath('/dashboard')} style={{ display: 'block', marginBottom: 12 }}>
            {avatarUrl?.trim() ? (
              <img src={avatarUrl} alt="Logo" style={{ height: 40, width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
            ) : (
              <img src="/detailopslogo.png" alt="DetailOps" style={{ height: 40, width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
            )}
          </Link>
          {/* Create new dropdown */}
          <div ref={createRef} style={{ position: 'relative', marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setCreateOpen((o) => !o)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--accent, #00b8f5)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "var(--font-instrument), sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                boxShadow: '0 0 20px color-mix(in srgb, var(--accent, #00b8f5) 30%, transparent), inset 0 1px 0 rgba(255,255,255,0.15)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 0 30px color-mix(in srgb, var(--accent, #00b8f5) 50%, transparent), inset 0 1px 0 rgba(255,255,255,0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = '0 0 20px color-mix(in srgb, var(--accent, #00b8f5) 30%, transparent), inset 0 1px 0 rgba(255,255,255,0.15)'
              }}
            >
              <Plus size={18} />
              Create new
              <ChevronDown size={16} style={{ opacity: 0.9 }} />
            </button>
            {createOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 6,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  zIndex: 10,
                }}
              >
                <Link
                  href={crmPath('/jobs/new')}
                  onClick={() => setCreateOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    color: 'var(--text-1)',
                    textDecoration: 'none',
                    fontSize: 14,
                    borderRadius: 6,
                  }}
                  className="hover:bg-[var(--surface-3)]"
                >
                  <ClipboardList size={18} style={{ color: 'var(--text-2)' }} />
                  New Job
                </Link>
                <Link
                  href={crmPath('/customers')}
                  onClick={() => setCreateOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    color: 'var(--text-1)',
                    textDecoration: 'none',
                    fontSize: 14,
                    borderRadius: 6,
                  }}
                  className="hover:bg-[var(--surface-3)]"
                >
                  <Users size={18} style={{ color: 'var(--text-2)' }} />
                  New Customer
                </Link>
                <Link
                  href={crmPath('/services')}
                  onClick={() => setCreateOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    color: 'var(--text-1)',
                    textDecoration: 'none',
                    fontSize: 14,
                    borderRadius: 6,
                  }}
                  className="hover:bg-[var(--surface-3)]"
                >
                  <Wrench size={18} style={{ color: 'var(--text-2)' }} />
                  New Service
                </Link>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <Link
                  href={crmPath('/invoices')}
                  onClick={() => setCreateOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    color: 'var(--text-1)',
                    textDecoration: 'none',
                    fontSize: 14,
                    borderRadius: 6,
                  }}
                  className="hover:bg-[var(--surface-3)]"
                >
                  <FileText size={18} style={{ color: 'var(--text-2)' }} />
                  New Invoice
                </Link>
              </div>
            )}
          </div>
          {/* Nav groups */}
          {groups.map((group) => (
            <div key={group.label} style={{ marginBottom: 16 }}>
              <div className="sidebar-section-label">
                {group.label}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const showJobBadge = item.label === 'Jobs' && jobCount > 0
                const showInvoiceBadge = item.label === 'Invoices' && invoiceCount > 0
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => onMobileOpenChange?.(false)}
                    className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
                  >
                    {isActive && <div className="sidebar-active-bar" />}
                    <Icon className={`sidebar-nav-icon h-5 w-5 shrink-0 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-2)]'}`} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {showJobBadge && <span className="sidebar-badge">{jobCount}</span>}
                    {showInvoiceBadge && <span className="sidebar-badge">{invoiceCount}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
        {/* Footer user card */}
        <div
          style={{
            flexShrink: 0,
            borderTop: '1px solid var(--border)',
            padding: 14,
            background: 'var(--surface-1)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            {avatarUrl?.trim() ? (
              <div className="sidebar-user-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                <img
                  src={avatarUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ) : (
              <div className="sidebar-user-avatar">{initials}</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                {fullName ?? 'User'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'capitalize' }}>
                {userRole ?? role}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="sidebar-signout-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 0',
              background: 'none',
              border: 'none',
              width: '100%',
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            <span className="sidebar-signout-label" style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.05em', transition: 'color 0.15s' }}>
              SIGN_OUT
            </span>
          </button>
        </div>
      </aside>
      {/* Mobile menu button */}
      {onMobileOpenChange && (
        <button
          type="button"
          onClick={() => onMobileOpenChange(true)}
          style={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 30,
            padding: 10,
            minWidth: 44,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-1)',
            cursor: 'pointer',
          }}
          className="lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      )}
      {mobileOpen && onMobileOpenChange && (
        <button
          type="button"
          onClick={() => onMobileOpenChange(false)}
          style={{
            position: 'fixed',
            top: 12,
            left: 224 + 8,
            zIndex: 51,
            padding: 10,
            minWidth: 44,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-1)',
            cursor: 'pointer',
          }}
          className="lg:hidden"
          aria-label="Close menu"
        >
          <X size={24} />
        </button>
      )}
    </>
  )
}
