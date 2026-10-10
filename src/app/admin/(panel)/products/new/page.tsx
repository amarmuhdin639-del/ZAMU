import { db } from '@/lib/db'
import { ProductForm } from '@/components/admin/product-form'
import { T } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  const categories = await db.category.findMany({ orderBy: { sortOrder: 'asc' } })
  return (
    <div>
      <T as="h1" k="admin.form.newProduct" className="font-display text-3xl uppercase tracking-tight" />
      <ProductForm categories={categories} />
    </div>
  )
}
