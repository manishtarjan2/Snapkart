import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import DeliveryBoy from "@/models/deliveryboy.model";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

const SUPER_ROLES = ["admin", "superAdmin", "storeAdmin"];

// ─── PATCH — block/unblock, change role, reset password ────────────────────
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !SUPER_ROLES.includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    try {
        // ── Password reset ──────────────────────────────────────────────────
        if (body.newPassword) {
            if (body.newPassword.length < 8) {
                return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 });
            }
            const hashed = await bcrypt.hash(body.newPassword, 12);
            const user = await User.findByIdAndUpdate(
                id,
                { $set: { password: hashed } },
                { new: true }
            ).select("-password");
            if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
            return NextResponse.json({ message: "Password reset successfully" }, { status: 200 });
        }

        // ── Field update ────────────────────────────────────────────────────
        const allowed = ["isBlocked", "role", "name", "mobile", "store_id"] as const;
        const updateFields: Record<string, unknown> = {};
        for (const key of allowed) {
            if (body[key] !== undefined) updateFields[key] = body[key];
        }

        const user = await User.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select("-password");

        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

        // If role changed FROM deliveryBoy, deactivate delivery profile
        if (body.role && body.role !== "deliveryBoy") {
            await DeliveryBoy.findOneAndUpdate(
                { userId: id },
                { $set: { isActive: false, status: "offline" } }
            );
        }

        return NextResponse.json(user, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ─── DELETE — remove admin account (superAdmin only) ────────────────────────
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectDb();
    const session = await auth();
    if (session?.user?.role !== "superAdmin") {
        return NextResponse.json({ message: "Forbidden — Super Admin only" }, { status: 403 });
    }

    const { id } = await params;

    // Prevent deleting yourself
    if (session.user.id === id || (session.user as { _id?: string })._id === id) {
        return NextResponse.json({ message: "Cannot delete your own account" }, { status: 400 });
    }

    try {
        const user = await User.findByIdAndDelete(id);
        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
        // Also remove delivery profile if any
        await DeliveryBoy.findOneAndDelete({ userId: id });
        return NextResponse.json({ message: "Account deleted" }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ─── GET — single user detail (superAdmin or admin) ─────────────────────────
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !SUPER_ROLES.includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    try {
        const user = await User.findById(id).select("-password");
        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
        return NextResponse.json(user, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
