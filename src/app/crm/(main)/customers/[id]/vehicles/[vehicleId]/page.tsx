import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { VehicleForm } from '../../vehicle-form'

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string; vehicleId: string }>
}) {
  const { id: customerId, vehicleId } = await params
  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', customerId)
    .single()

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', vehicleId)
    .eq('customer_id', customerId)
    .single()

  if (!customer || !vehicle) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Link href={crmPath('/customers')} className="hover:text-zinc-100">Customers</Link>
        <span>/</span>
        <Link href={crmPath(`/customers/${customerId}`)} className="hover:text-zinc-100">{customer.name}</Link>
        <span>/</span>
        <span className="text-zinc-100">{vehicle.year} {vehicle.make} {vehicle.model}</span>
      </div>
      <h1 className="text-2xl font-bold text-zinc-100">Edit vehicle</h1>
      <VehicleForm customerId={customerId} vehicle={vehicle} />
    </div>
  )
}
