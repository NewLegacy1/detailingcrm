import { redirect } from 'next/navigation'
import { crmPath } from '@/lib/crm-path'

export default async function NewVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: customerId } = await params
  redirect(crmPath(`/customers?customer=${customerId}`))
}
