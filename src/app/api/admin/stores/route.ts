import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Store from "@/models/store.model";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED = ["admin", "superAdmin", "storeAdmin"];

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/stores  — list all store branches
// ────────────────────────────────────────────────────────────────────────────
export async function GET() {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !ALLOWED.includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        // storeAdmin can only see their own store
        const filter: Record<string, unknown> = {};
        if (session.user.role === "storeAdmin") {
            const storeId = (session.user as { store_id?: string }).store_id;
            if (storeId) filter._id = storeId;
        }
        const stores = await Store.find(filter).populate("manager_id", "name email").sort({ createdAt: -1 });
        return NextResponse.json(stores, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/admin/stores  — create a new store branch (superAdmin only)
//   Body: { name, address: { street, city, state, pincode },
//           phone?, location?: { coordinates: [lng, lat] } }
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();
    const session = await auth();
    // Only superAdmin (or legacy admin) can create stores
    if (!session?.user?.role || !["admin", "superAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, address, phone, location } = body;

        if (!name || !address?.street || !address?.city || !address?.state || !address?.pincode) {
            return NextResponse.json(
                { message: "name and complete address are required" },
                { status: 400 }
            );
        }

        const store = await Store.create({
            name,
            address,
            phone,
            ...(location && { location }),
        });

        return NextResponse.json(store, { status: 201 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
