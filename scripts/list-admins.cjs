/**
 * scripts/list-admins.cjs
 *
 * Lists all admin accounts (email, role, name, id) from MongoDB.
 * Passwords are hashed so they cannot be shown — use the known plaintext below.
 *
 * Run from project root:
 *   node scripts/list-admins.cjs
 */

const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

// ── Load .env.local ─────────────────────────────────────────────────────────
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf-8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.startsWith("#"))
        .forEach((l) => {
            const [key, ...rest] = l.split("=");
            process.env[key.trim()] = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
        });
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("❌  MONGODB_URI not found in .env.local");
    process.exit(1);
}

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    role: String,
    isBlocked: Boolean,
    store_id: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

async function main() {
    console.log("⏳  Connecting to MongoDB…");
    await mongoose.connect(MONGODB_URI);
    console.log("✅  Connected.\n");

    const User = mongoose.models.User || mongoose.model("User", userSchema);

    const ADMIN_ROLES = ["superAdmin", "storeAdmin", "productAdmin", "deliveryAdmin", "deliveryBoy", "admin"];
    const admins = await User.find({ role: { $in: ADMIN_ROLES } })
        .select("name email role isBlocked store_id createdAt _id")
        .sort({ role: 1, createdAt: 1 })
        .lean();

    if (admins.length === 0) {
        console.log("⚠️  No admin accounts found in the database.");
        await mongoose.disconnect();
        return;
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  Found ${admins.length} admin account(s)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    for (const a of admins) {
        console.log(`  Role     : ${a.role}`);
        console.log(`  Name     : ${a.name}`);
        console.log(`  Email    : ${a.email}`);
        console.log(`  DB ID    : ${a._id}`);
        console.log(`  Blocked  : ${a.isBlocked ? "YES ⛔" : "No ✅"}`);
        if (a.store_id) console.log(`  Store ID : ${a.store_id}`);
        console.log(`  Created  : ${new Date(a.createdAt).toLocaleString("en-IN")}`);
        console.log("  ─────────────────────────────────────────────────────────────");
    }

    console.log("\n⚠️  Passwords are bcrypt-hashed and cannot be read from DB.");
    console.log("   Known seeded credentials:");
    console.log("   superAdmin → superadmin@snapkart.com  /  SuperAdmin@2026");
    console.log("   Other admins → use the password set during registration.\n");

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error("❌  Error:", err.message);
    process.exit(1);
});
