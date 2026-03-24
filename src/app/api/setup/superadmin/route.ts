import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    await connectDb();

    const { name, email, password, setupKey } = await req.json();

    // ── Security gate: validate setup key ─────────────────────────────────────
    const validKey = process.env.SUPER_ADMIN_SETUP_KEY;
    if (!validKey || setupKey !== validKey) {
        return NextResponse.json(
            { message: "Invalid or missing setup key." },
            { status: 403 }
        );
    }

    // ── Allow only ONE superAdmin to be created via this route ─────────────────
    const existingSuperAdmin = await User.findOne({ role: "superAdmin" });
    if (existingSuperAdmin) {
        return NextResponse.json(
            { message: "A Super Admin already exists. Use the dashboard to create more admins." },
            { status: 409 }
        );
    }

    // ── Validate fields ────────────────────────────────────────────────────────
    if (!name || !email || !password) {
        return NextResponse.json({ message: "All fields are required." }, { status: 400 });
    }
    if (password.length < 8) {
        return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await User.findOne({ email });
    if (existing) {
        return NextResponse.json({ message: "Email already registered." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const admin = await User.create({
        name,
        email,
        password: hashed,
        role: "superAdmin",
        isBlocked: false,
    });

    return NextResponse.json(
        { message: "Super Admin created successfully!", id: admin._id },
        { status: 201 }
    );
}
