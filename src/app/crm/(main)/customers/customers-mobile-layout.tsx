'use client'

import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { ChevronLeft } from 'lucide-react'

interface CustomersMobileLayoutProps {
  selectedId: string | null
  listSidebar: React.ReactNode
  detailContent: React.ReactNode
}

/** On mobile (< lg): show only list or only detail. On lg: show both. */
export function CustomersMobileLayout({ selectedId, listSidebar, detailContent }: CustomersMobileLayoutProps) {
  return (
    <div className="flex flex-1 min-h-0">
      <div
        className={`flex h-full flex-col shrink-0 border-r ${selectedId ? 'hidden lg:flex lg:w-80' : 'w-full lg:w-80'}`}
        style={{ borderColor: 'var(--border)' }}
      >
        {listSidebar}
      </div>
      <div
        className={`flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 ${!selectedId ? 'hidden lg:flex flex-col' : 'flex flex-col'}`}
      >
        {selectedId && (
          <div className="lg:hidden mb-4">
            <Link
              href={crmPath('/customers')}
              className="inline-flex items-center gap-1 text-sm min-h-[44px] items-center pr-2"
              style={{ color: 'var(--text-2)' }}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to list
            </Link>
          </div>
        )}
        {detailContent}
      </div>
    </div>
  )
}
