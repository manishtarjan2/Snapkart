/**
 * set-default-stock.cjs
 *
 * Sets stock=10 and inStock=true for all products that currently have stock=0.
 * This is a temporary fix to make products visible in the user dashboard.
 * You should then set proper stock quantities via the admin panel.
 *
 * Run: node scripts/set-default-stock.cjs
 */
const fs   = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// Read .env.local
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
if (!MONGODB_URI) { console.error("❌ MONGODB_URI missing"); process.exit(1); }

const Product = mongoose.model(
  "Grocery",
  new mongoose.Schema({ name: String, stock: Number, inStock: Boolean }, { collection: "groceries" })
);

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected\n");

  const zeroStock = await Product.find({ stock: { $lte: 0 } }, "name stock inStock").lean();
  console.log(`Found ${zeroStock.length} product(s) with stock=0:`);
  zeroStock.forEach(p => console.log(`  - ${p.name}`));

  if (zeroStock.length === 0) {
    console.log("\n✅ All products already have stock > 0. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  const DEFAULT_STOCK = 10; // default stock to assign
  const res = await Product.updateMany(
    { stock: { $lte: 0 } },
    { $set: { stock: DEFAULT_STOCK, inStock: true } }
  );

  console.log(`\n✅ Updated ${res.modifiedCount} product(s) → stock=${DEFAULT_STOCK}, inStock=true`);
  console.log("\n⚠️  These are placeholder values. Please update the actual stock");
  console.log("   quantities for each product via the admin dashboard.\n");

  await mongoose.disconnect();
  console.log("Done!");
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
