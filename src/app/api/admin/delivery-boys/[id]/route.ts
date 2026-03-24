import { auth } from "@/auth";
import connectDb from "@/lib/db";
import DeliveryBoy from "@/models/deliveryboy.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/delivery-boys/[id]
//   Update vehicleType, vehicleNumber, store_id, status, isActive
// ────────────────────────────────────────────────────────────────────────────
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !["admin", "superAdmin", "deliveryAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const allowed = ["name", "phone", "vehicleType", "vehicleNumber", "store_id", "status", "isActive"] as const;
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
        if (body[key] !== undefined) update[key] = body[key];
    }

    try {
        const profile = await DeliveryBoy.findByIdAndUpdate(
            id,
            { $set: update },
            { new: true, runValidators: true }
        ).populate("userId", "name email mobile");

        if (!profile) return NextResponse.json({ message: "Delivery boy not found" }, { status: 404 });
        return NextResponse.json(profile, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/delivery-boys/[id]  — deactivate profile
// ────────────────────────────────────────────────────────────────────────────
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !["admin", "superAdmin", "deliveryAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    try {
        await DeliveryBoy.findByIdAndUpdate(id, { isActive: false, status: "offline" });
        return NextResponse.json({ message: "Delivery boy deactivated" }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
