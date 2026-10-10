import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { ProductForm } from '@/components/admin/product-form'
import { T } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [categories, product] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    db.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: 'asc' } } } }),
  ])
  if (!product) notFound()
  return (
    <div>
      <T as="h1" k="admin.form.editProduct" className="font-display text-3xl uppercase tracking-tight" />
      <ProductForm
        categories={categories}
        product={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          description: product.description,
          price: product.price,
          salePrice: product.salePrice,
          categoryId: product.categoryId,
          customCategory: product.customCategory,
          stock: product.stock,
          sizes: product.sizes,
          colors: product.colors,
          featured: product.featured,
          isNew: product.isNew,
          bestSeller: product.bestSeller,
          active: product.active,
          images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
        }}
      />
    </div>
  )
}
