import { redirect } from 'next/navigation'
import { crmPath } from '@/lib/crm-path'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(crmPath(`/customers?customer=${id}`))
}
