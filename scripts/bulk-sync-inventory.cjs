/**
 * bulk-sync-inventory.cjs
 *
 * FAST bulk operation — runs all in parallel:
 * 1. Sets inStock=true + stock=10 for any product with stock <= 0
 * 2. Re-syncs Product.stock from StoreInventory totals  
 * 3. Fixes any inStock mismatch (stock>0 but inStock=false, or stock=0 but inStock=true)
 *
 * Run: node scripts/bulk-sync-inventory.cjs
 */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    const k = t.slice(0, idx).trim();
    const v = t.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error("❌ MONGODB_URI missing in .env.local"); process.exit(1); }

// ── Schemas ──────────────────────────────────────────────────────────────────
const Product = mongoose.model(
  "Grocery",
  new mongoose.Schema({ name: String, stock: Number, inStock: Boolean, isActive: Boolean }, { collection: "groceries" })
);

const StoreInventory = mongoose.model(
  "StoreInventory",
  new mongoose.Schema({ product_id: mongoose.Schema.Types.ObjectId, stock: Number }, { collection: "storeinventories" })
);

async function main() {
  const t0 = Date.now();
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB\n");

  // ── Step 1: Sync from StoreInventory (if any records exist) ─────────────────
  const invAgg = await StoreInventory.aggregate([
    { $group: { _id: "$product_id", totalStock: { $sum: "$stock" } } },
  ]);

  if (invAgg.length > 0) {
    console.log(`📦 Syncing ${invAgg.length} products from StoreInventory...`);
    const invOps = invAgg.map(({ _id, totalStock }) => ({
      updateOne: {
        filter: { _id },
        update: { $set: { stock: totalStock, inStock: totalStock > 0 } },
      },
    }));
    const r1 = await Product.bulkWrite(invOps, { ordered: false });
    console.log(`   ✓ StoreInventory → Product sync: ${r1.modifiedCount} updated`);
  } else {
    console.log("ℹ️  No StoreInventory records found — skipping store sync");
  }

  // ── Step 2: Fix products with stock<=0 → set to 10 (placeholder) ─────────
  const zeroCount = await Product.countDocuments({ stock: { $lte: 0 } });
  if (zeroCount > 0) {
    const r2 = await Product.updateMany(
      { stock: { $lte: 0 } },
      { $set: { stock: 10, inStock: true } }
    );
    console.log(`\n🔧 Fixed ${r2.modifiedCount} products with stock=0 → stock=10, inStock=true`);
    console.log("   ⚠️  These are placeholder values — update real quantities via admin panel");
  } else {
    console.log("\n✅ All products already have stock > 0");
  }

  // ── Step 3: Fix any inStock mismatches ───────────────────────────────────
  const [misA, misB] = await Promise.all([
    Product.updateMany({ stock: { $gt: 0 }, inStock: false }, { $set: { inStock: true } }),
    Product.updateMany({ stock: { $lte: 0 }, inStock: true }, { $set: { inStock: false } }),
  ]);
  if (misA.modifiedCount > 0) console.log(`\n🔧 Fixed ${misA.modifiedCount} products: stock>0 but inStock=false`);
  if (misB.modifiedCount > 0) console.log(`🔧 Fixed ${misB.modifiedCount} products: stock=0 but inStock=true`);

  // ── Final report ─────────────────────────────────────────────────────────
  const [total, inStockCount, outCount] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ inStock: true }),
    Product.countDocuments({ inStock: false }),
  ]);

  console.log(`\n📊 Final State:`);
  console.log(`   Total products : ${total}`);
  console.log(`   In stock       : ${inStockCount} ✅`);
  console.log(`   Out of stock   : ${outCount} ❌`);
  console.log(`\n⏱  Done in ${Date.now() - t0}ms`);

  await mongoose.disconnect();
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
