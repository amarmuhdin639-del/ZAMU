import { AdminOrderDetail } from '@/components/admin/order-detail'

export const dynamic = 'force-dynamic'

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AdminOrderDetail orderId={id} />
}
