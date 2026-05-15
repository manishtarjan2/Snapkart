/**
 * fix-delivery-profiles.cjs
 *
 * One-time script: finds all Users with role="deliveryBoy" or "diliveryBoy"
 * who are missing a DeliveryBoy profile, and creates one for them.
 *
 * Run with:  node scripts/fix-delivery-profiles.cjs
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// ── Load .env.local manually ─────────────────────────────────────────────────
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

// ── Minimal schemas ──────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
    { name: String, email: String, mobile: String, role: String },
    { collection: "users" }
);

const deliveryBoySchema = new mongoose.Schema(
    {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        phone: String,
        vehicleType: String,
        status: String,
        isActive: Boolean,
        totalDeliveries: Number,
        currentLocation: {
            type: { type: String, default: "Point" },
            coordinates: { type: [Number], default: [0, 0] },
        },
    },
    { collection: "deliveryboys" }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
const DeliveryBoy =
    mongoose.models.DeliveryBoy || mongoose.model("DeliveryBoy", deliveryBoySchema);

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log("🔌  Connecting to MongoDB…");
    await mongoose.connect(MONGODB_URI);
    console.log("✅  Connected\n");

    // Find all delivery boy users
    const deliveryUsers = await User.find({
        role: { $in: ["deliveryBoy", "diliveryBoy"] },
    });

    console.log(`📋  Found ${deliveryUsers.length} user(s) with delivery boy role\n`);

    let created = 0;
    let existed = 0;

    for (const user of deliveryUsers) {
        const existing = await DeliveryBoy.findOne({ userId: user._id });
        if (existing) {
            console.log(`  ✓  ${user.name} (${user.email}) — profile already exists`);
            existed++;
            continue;
        }

        await DeliveryBoy.create({
            userId: user._id,
            name: user.name,
            phone: user.mobile || "0000000000",
            vehicleType: "bike",
            status: "available",
            isActive: true,
            totalDeliveries: 0,
        });

        console.log(`  ✨ ${user.name} (${user.email}) — profile CREATED`);
        created++;
    }

    // Also fix any "diliveryBoy" typo → "deliveryBoy"
    const fixed = await User.updateMany(
        { role: "diliveryBoy" },
        { $set: { role: "deliveryBoy" } }
    );
    if (fixed.modifiedCount > 0) {
        console.log(`\n🔧  Fixed ${fixed.modifiedCount} user(s) with typo role "diliveryBoy" → "deliveryBoy"`);
    }

    console.log(`\n📊  Summary: created=${created}  already existed=${existed}`);
    console.log("✅  Done!");

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error("❌  Error:", err.message);
    process.exit(1);
});
