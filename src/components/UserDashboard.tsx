import React from 'react'
import HeroSection from './HeroSection'
import connectDb from '@/lib/db'
import Product from '@/models/product.model'
import CartSidebar from './CartSidebar'
import ProductGrid from './ProductGrid'

// Force dynamic rendering — stock updates from admin are visible on next page load
export const dynamic = 'force-dynamic';

async function UserDashboard() {
  await connectDb()

  // Fetch only active products, sorted newest first
  // Uses the canonical Product model (same Grocery collection) — all fields present
  const products = await Product.find({ isActive: { $ne: false } })
    .select('name price category subcategory image description inStock stock discount brand unit barcode tags createdAt')
    .sort({ createdAt: -1 })
    .lean()              // return plain JS objects, faster serialisation

  return (
    <div className="pb-10">
      {/* Cart sidebar — always mounted, opens on add-to-cart */}
      <CartSidebar />

      {/* Hero with live search */}
      <HeroSection />

      {/* Category filter + product grid (client component) */}
      <ProductGrid initialItems={JSON.parse(JSON.stringify(products))} />
    </div>
  )
}

export default UserDashboard
