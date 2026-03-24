/**
 * sync-product-stock.mjs
 *
 * One-time script: reads all StoreInventory records, aggregates total stock
 * per product across all stores, and updates Product.stock + Product.inStock.
 *
 * Products with NO StoreInventory entries keep whatever stock was set
 * directly on them (e.g. products added via add-grocery with a stock value).
 *
 * Run with:  node scripts/sync-product-stock.mjs
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import mongoose from "mongoose";

// ── Load .env.local ──────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI not found in .env.local");
  process.exit(1);
}

// ── Minimal schemas (match real ones) ────────────────────────────────────────
const storeInventorySchema = new mongoose.Schema({
  product_id: mongoose.Schema.Types.ObjectId,
  stock: Number,
});

const productSchema = new mongoose.Schema({
  name: String,
  inStock: Boolean,
  stock: Number,
});

// Use same collection names as the app
const StoreInventory =
  mongoose.models.StoreInventory ||
  mongoose.model("StoreInventory", storeInventorySchema, "storeinventories");

const Product =
  mongoose.models.Grocery ||
  mongoose.model("Grocery", productSchema, "groceries");

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔌  Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected\n");

  // Aggregate total stock per product across all stores
  const agg = await StoreInventory.aggregate([
    {
      $group: {
        _id: "$product_id",
        totalStock: { $sum: "$stock" },
      },
    },
  ]);

  console.log(`📦  Found ${agg.length} products in StoreInventory\n`);

  let updated = 0;
  let skipped = 0;

  for (const { _id: productId, totalStock } of agg) {
    const result = await Product.updateOne(
      { _id: productId },
      { $set: { stock: totalStock, inStock: totalStock > 0 } }
    );
    if (result.modifiedCount > 0) {
      updated++;
      console.log(`  ✓ Product ${productId}  →  stock=${totalStock}  inStock=${totalStock > 0}`);
    } else {
      skipped++;
      console.log(`  ⚠ Product ${productId} not found in Grocery collection (skipped)`);
    }
  }

  // Also fix products that have stock > 0 in Product model but inStock = false
  // (products added directly via add-grocery with stock > 0)
  const directFix = await Product.updateMany(
    { stock: { $gt: 0 }, inStock: false },
    { $set: { inStock: true } }
  );
  if (directFix.modifiedCount > 0) {
    console.log(`\n🔧  Fixed ${directFix.modifiedCount} products that had stock>0 but inStock=false`);
  }

  console.log(`\n✅  Done!  Updated: ${updated}  Skipped: ${skipped}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌  Error:", err);
  process.exit(1);
});
