/**
 * scripts/seed-super-admin.cjs  (CommonJS — works without "type":"module")
 *
 * Creates the superAdmin account in MongoDB.
 *
 * Run from project root:
 *   node scripts/seed-super-admin.cjs
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

// ── Load .env.local manually (no dotenv needed) ────────────────────────────
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

// ── Credentials (edit if you want a different password) ───────────────────
const SUPER_ADMIN_EMAIL = "superadmin@snapkart.com";
const SUPER_ADMIN_PASSWORD = "SuperAdmin@2026";
const SUPER_ADMIN_NAME = "Super Admin";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: String,
    role: { type: String, default: "user" },
    isBlocked: { type: Boolean, default: false },
}, { timestamps: true });

async function seed() {
    console.log("⏳  Connecting to MongoDB…");
    await mongoose.connect(MONGODB_URI);
    console.log("✅  Connected.\n");

    const User = mongoose.models.User || mongoose.model("User", userSchema);

    const existing = await User.findOne({ email: SUPER_ADMIN_EMAIL });
    if (existing) {
        console.log(`⚠️   User "${SUPER_ADMIN_EMAIL}" already exists (role: ${existing.role})`);
        if (existing.role !== "superAdmin") {
            existing.role = "superAdmin";
            await existing.save();
            console.log("✅  Role upgraded to superAdmin!");
        } else {
            console.log("✅  Already superAdmin — nothing changed.");
        }
        await mongoose.disconnect();
        return;
    }

    const hashed = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
    const admin = await User.create({
        name: SUPER_ADMIN_NAME,
        email: SUPER_ADMIN_EMAIL,
        password: hashed,
        role: "superAdmin",
        isBlocked: false,
    });

    console.log("🎉  Super Admin created!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  Email    : ${SUPER_ADMIN_EMAIL}`);
    console.log(`  Password : ${SUPER_ADMIN_PASSWORD}`);
    console.log(`  Role     : ${admin.role}`);
    console.log(`  DB ID    : ${admin._id}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n👉  Go to http://localhost:3000/auth/login and sign in.");

    await mongoose.disconnect();
}

seed().catch((err) => {
    console.error("❌  Seed failed:", err.message);
    process.exit(1);
});
