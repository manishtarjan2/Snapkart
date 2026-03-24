import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED = ["admin", "superAdmin", "storeAdmin", "deliveryAdmin"];

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users  — list all users (with optional ?role= filter)
// ────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !ALLOWED.includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const role = req.nextUrl.searchParams.get("role");
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;

    // storeAdmin can only see users for their store
    if (session.user.role === "storeAdmin") {
        const storeId = (session.user as { store_id?: string }).store_id;
        filter.store_id = storeId ?? null;
    }

    try {
        const users = await User.find(filter)
            .select("-password")
            .populate("store_id", "name address.city")
            .sort({ createdAt: -1 });
        return NextResponse.json(users, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

