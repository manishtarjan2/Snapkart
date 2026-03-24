/**
 * scripts/seed-super-admin.mjs
 *
 * One-time script to create the superAdmin account in MongoDB.
 *
 * Usage (run from project root):
 *   node scripts/seed-super-admin.mjs
 *
 * ⚠️  Run once only. If you run again it will say "already exists".
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Load .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("❌  MONGODB_URI not found in .env.local");
    process.exit(1);
}

// ── Super Admin credentials (change before first run if you want) ───────────
const SUPER_ADMIN_EMAIL = "superadmin@snapkart.com";
const SUPER_ADMIN_PASSWORD = "SuperAdmin@2026";
const SUPER_ADMIN_NAME = "Super Admin";

// Minimal user schema inline (avoids Next.js module resolution issues)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String },
    role: { type: String, default: "user" },
    isBlocked: { type: Boolean, default: false },
}, { timestamps: true });

async function seed() {
    console.log("⏳  Connecting to MongoDB…");
    await mongoose.connect(MONGODB_URI);
    console.log("✅  Connected.");

    const User = mongoose.models.User ?? mongoose.model("User", userSchema);

    const existing = await User.findOne({ email: SUPER_ADMIN_EMAIL });
    if (existing) {
        console.log(`\n⚠️   A user with email "${SUPER_ADMIN_EMAIL}" already exists.`);
        console.log(`     Role is currently: ${existing.role}`);
        if (existing.role !== "superAdmin") {
            existing.role = "superAdmin";
            await existing.save();
            console.log("✅  Role upgraded to superAdmin.");
        } else {
            console.log("✅  Already a superAdmin. Nothing to do.");
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

    console.log("\n🎉  Super Admin created successfully!");
    console.log("─────────────────────────────────────");
    console.log(`  Email    : ${SUPER_ADMIN_EMAIL}`);
    console.log(`  Password : ${SUPER_ADMIN_PASSWORD}`);
    console.log(`  Role     : ${admin.role}`);
    console.log(`  ID       : ${admin._id}`);
    console.log("─────────────────────────────────────");
    console.log("\n👉  Now go to http://localhost:3000/auth/login and sign in.");

    await mongoose.disconnect();
}

seed().catch((err) => {
    console.error("❌  Seed failed:", err.message);
    process.exit(1);
});
