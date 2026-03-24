import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

// Roles a storeAdmin is allowed to create for their store
const STORE_CREATABLE_ROLES = ["productAdmin", "posAdmin"] as const;

// ─── GET — list all staff under this store ───────────────────────────────────
export async function GET() {
    const session = await auth();
    const allowed = ["storeAdmin", "superAdmin"];
    if (!session?.user?.role || !allowed.includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDb();

    // superAdmin sees all; storeAdmin sees only their store's staff
    const filter =
        session.user.role === "superAdmin"
            ? { role: { $in: [...STORE_CREATABLE_ROLES, "posAdmin", "employee"] } }
            : {
                role: { $in: [...STORE_CREATABLE_ROLES, "posAdmin", "employee"] },
                store_id: (session.user as { store_id?: string }).store_id ?? null,
            };

    const staff = await User.find(filter)
        .select("name email role employeeId isBlocked store_id createdAt")
        .lean();

    return NextResponse.json(staff);
}

// ─── POST — create productAdmin or posAdmin (storeAdmin only) ────────────────
export async function POST(req: NextRequest) {
    const session = await auth();
    const allowed = ["storeAdmin", "superAdmin"];
    if (!session?.user?.role || !allowed.includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDb();

    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
        return NextResponse.json({ message: "All fields required" }, { status: 400 });
    }
    if (!STORE_CREATABLE_ROLES.includes(role as typeof STORE_CREATABLE_ROLES[number])) {
        return NextResponse.json(
            { message: `Role must be one of: ${STORE_CREATABLE_ROLES.join(", ")}` },
            { status: 400 }
        );
    }
    if (password.length < 8) {
        return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await User.findOne({ email });
    if (existing) {
        return NextResponse.json({ message: "Email already registered" }, { status: 409 });
    }

    const store_id = (session.user as { store_id?: string }).store_id ?? null;
    const hashed = await bcrypt.hash(password, 12);

    const newUser = await User.create({
        name,
        email,
        password: hashed,
        role,
        store_id,
        isBlocked: false,
    });

    return NextResponse.json(
        {
            message: `${role} account created successfully`,
            id: newUser._id,
            name: newUser.name,
            role: newUser.role,
            email: newUser.email,
        },
        { status: 201 }
    );
}

// ─── DELETE — remove a staff member ─────────────────────────────────────────
export async function DELETE(req: NextRequest) {
    const session = await auth();
    const allowed = ["storeAdmin", "superAdmin"];
    if (!session?.user?.role || !allowed.includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDb();

    const { id } = await req.json();
    if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

    const user = await User.findByIdAndDelete(id);
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    return NextResponse.json({ message: "Staff member removed" });
}

// ─── PATCH — block/unblock staff or reset password ───────────────────────────
export async function PATCH(req: NextRequest) {
    const session = await auth();
    const allowed = ["storeAdmin", "superAdmin"];
    if (!session?.user?.role || !allowed.includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDb();

    const body = await req.json();
    const { id, isBlocked, newPassword } = body;
    if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

    if (newPassword) {
        if (newPassword.length < 8) {
            return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 });
        }
        const hashed = await bcrypt.hash(newPassword, 12);
        await User.findByIdAndUpdate(id, { password: hashed });
        return NextResponse.json({ message: "Password reset successfully" });
    }

    if (isBlocked !== undefined) {
        await User.findByIdAndUpdate(id, { isBlocked });
        return NextResponse.json({ message: `User ${isBlocked ? "blocked" : "unblocked"}` });
    }

    return NextResponse.json({ message: "No changes made" }, { status: 400 });
}
