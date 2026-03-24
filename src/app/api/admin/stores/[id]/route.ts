import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Store from "@/models/store.model";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED = ["admin", "superAdmin"];

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/stores/[id]  — update a store branch
// ────────────────────────────────────────────────────────────────────────────
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !ALLOWED.includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const allowed = ["name", "address", "phone", "location", "isActive", "commission", "deliveryRadiusKm", "manager_id"] as const;
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
        if (body[key] !== undefined) update[key] = body[key];
    }

    try {
        const store = await Store.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
        if (!store) return NextResponse.json({ message: "Store not found" }, { status: 404 });
        return NextResponse.json(store, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/stores/[id]  — soft-delete (set isActive: false)
// ────────────────────────────────────────────────────────────────────────────
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !ALLOWED.includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    try {
        await Store.findByIdAndUpdate(id, { isActive: false });
        return NextResponse.json({ message: "Store deactivated" }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/stores/[id]  — single store details
// ────────────────────────────────────────────────────────────────────────────
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !["admin", "superAdmin", "storeAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    try {
        const store = await Store.findById(id).populate("manager_id", "name email");
        if (!store) return NextResponse.json({ message: "Store not found" }, { status: 404 });
        return NextResponse.json(store, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
