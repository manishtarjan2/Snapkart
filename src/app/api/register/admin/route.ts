import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";

const ALLOWED_ROLES = ["storeAdmin", "productAdmin", "deliveryAdmin", "deliveryBoy", "posAdmin"] as const;
type AdminRole = typeof ALLOWED_ROLES[number];

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session?.user || session.user.role !== "superAdmin") {
        return NextResponse.json({ message: "Forbidden — Super Admin only." }, { status: 403 });
    }

    await connectDb();

    const { name, email, password, role, store_id } = await req.json();

    // ── Validate role ──────────────────────────────────────────────────────────
    if (!ALLOWED_ROLES.includes(role as AdminRole)) {
        return NextResponse.json(
            { message: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(", ")}` },
            { status: 400 }
        );
    }

    // ── Validate fields ────────────────────────────────────────────────────────
    if (!name || !email || !password) {
        return NextResponse.json({ message: "Name, email and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
        return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await User.findOne({ email });
    if (existing) {
        return NextResponse.json({ message: "Email already registered." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const newAdmin = await User.create({
        name,
        email,
        password: hashed,
        role,
        store_id: store_id || undefined,
        isBlocked: false,
    });

    return NextResponse.json(
        {
            message: `${role} account created successfully!`,
            id: newAdmin._id,
            name: newAdmin.name,
            role: newAdmin.role,
        },
        { status: 201 }
    );
}

// List all staff accounts (for the dashboard)
export async function GET() {
    const session = await auth();
    if (!session?.user || session.user.role !== "superAdmin") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    await connectDb();
    const staff = await User.find(
        { role: { $in: ALLOWED_ROLES } },
        "name email role store_id isBlocked createdAt"
    ).lean();
    return NextResponse.json(staff);
}
