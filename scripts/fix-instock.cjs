/**
 * fix-instock.cjs  — one-time fix
 * Sets inStock=true for all products where stock > 0 but inStock=false
 * Run: node scripts/fix-instock.cjs
 */
const fs = require("fs");
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

  // Show current state
  const all = await Product.find({}, "name stock inStock").lean();
  console.log("Current products:");
  for (const p of all) {
    console.log(`  ${p.name}  |  stock: ${p.stock}  |  inStock: ${p.inStock}`);
  }

  // Fix 1: stock > 0 but inStock = false
  const fix1 = await Product.updateMany(
    { stock: { $gt: 0 }, inStock: false },
    { $set: { inStock: true } }
  );
  console.log(`\n✓ Fixed ${fix1.modifiedCount} product(s): stock>0 but inStock=false`);

  // Fix 2: stock = 0 but inStock = true (stale)
  const fix2 = await Product.updateMany(
    { stock: 0, inStock: true },
    { $set: { inStock: false } }
  );
  console.log(`✓ Fixed ${fix2.modifiedCount} product(s): stock=0 but inStock=true`);

  // After fix
  const after = await Product.find({}, "name stock inStock").lean();
  console.log("\nAfter fix:");
  for (const p of after) {
    console.log(`  ${p.name}  |  stock: ${p.stock}  |  inStock: ${p.inStock}`);
  }

  await mongoose.disconnect();
  console.log("\n✅ Done!");
}
main().catch(e => { console.error("❌", e.message); process.exit(1); });
