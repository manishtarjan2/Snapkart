/**
 * sync-product-stock.cjs
 *
 * One-time script: reads all StoreInventory records, aggregates total stock
 * per product across all stores, and updates Product.stock + Product.inStock.
 *
 * Run with:  node scripts/sync-product-stock.cjs
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// ── Load .env.local manually (no dotenv dependency needed) ───────────────────
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI not found in .env.local");
  process.exit(1);
}

// ── Minimal schemas (same collection names as the app) ───────────────────────
const storeInventorySchema = new mongoose.Schema(
  { product_id: mongoose.Schema.Types.ObjectId, stock: Number },
  { collection: "storeinventories" }
);

const productSchema = new mongoose.Schema(
  { name: String, inStock: Boolean, stock: Number },
  { collection: "groceries" }
);

const StoreInventory =
  mongoose.models.StoreInventory ||
  mongoose.model("StoreInventory", storeInventorySchema);

const Product =
  mongoose.models.Grocery ||
  mongoose.model("Grocery", productSchema);

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔌  Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected\n");

  // Aggregate total stock per product across all stores
  const agg = await StoreInventory.aggregate([
    { $group: { _id: "$product_id", totalStock: { $sum: "$stock" } } },
  ]);

  console.log(`📦  StoreInventory has entries for ${agg.length} unique products`);

  let updated = 0;
  let skipped = 0;

  for (const { _id: productId, totalStock } of agg) {
    const result = await Product.updateOne(
      { _id: productId },
      { $set: { stock: totalStock, inStock: totalStock > 0 } }
    );
    if (result.modifiedCount > 0) {
      updated++;
      console.log(`  ✓  ${productId}  stock=${totalStock}  inStock=${totalStock > 0}`);
    } else {
      skipped++;
      console.log(`  ⚠  ${productId}  — not found in Grocery collection`);
    }
  }

  // Fix products that have stock > 0 directly on the Product doc but inStock=false
  // (products added via add-grocery that were never added to a store inventory)
  const directFix = await Product.updateMany(
    { stock: { $gt: 0 }, inStock: false },
    { $set: { inStock: true } }
  );
  if (directFix.modifiedCount > 0) {
    console.log(
      `\n🔧  Fixed ${directFix.modifiedCount} product(s) that had stock>0 but inStock=false`
    );
  }

  // Show final state
  const total = await Product.countDocuments();
  const inStockCount = await Product.countDocuments({ inStock: true });
  const outOfStockCount = await Product.countDocuments({ inStock: false });
  console.log(`\n📊  Products: total=${total}  inStock=${inStockCount}  outOfStock=${outOfStockCount}`);
  console.log(`\n✅  Done!  Updated from StoreInventory: ${updated}  Skipped: ${skipped}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});
