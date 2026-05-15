import { auth } from "@/auth";
import connectDb from "@/lib/db";
import DeliveryBoy from "@/models/deliveryboy.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/delivery/status
//   Delivery boy updates their availability status.
//   Body: { status: "available" | "offline" }
// ────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id || !["deliveryBoy", "diliveryBoy"].includes(session.user.role)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { status } = await req.json();
        if (!status || !["available", "offline"].includes(status)) {
            return NextResponse.json({ message: "status must be available or offline" }, { status: 400 });
        }

        const boy = await DeliveryBoy.findOneAndUpdate(
            { userId: session.user.id },
            { status },
            { new: true }
        );

        if (!boy) {
            return NextResponse.json({ message: "Delivery boy profile not found" }, { status: 404 });
        }

        return NextResponse.json({ message: `Status updated to ${status}`, status: boy.status }, { status: 200 });
    } catch (err) {
        console.error("Delivery status update error:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
