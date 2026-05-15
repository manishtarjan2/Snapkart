import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { assignDeliveryBoyToOrder } from "@/lib/delivery";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// POST /api/delivery/assign
//
//   Called by admin (or auto-trigger) after an order is placed.
//   Finds the nearest AVAILABLE delivery boy and assigns the order.
//   Also generates the delivery OTP for doorstep confirmation.
//   Creates a Delivery tracking document.
//
//   Body: { orderId }
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !["admin", "storeAdmin", "superAdmin", "deliveryAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { orderId } = await req.json();
    if (!orderId) {
        return NextResponse.json({ message: "orderId required" }, { status: 400 });
    }

    try {
        const order = await Order.findById(orderId);
        if (!order) throw new Error("Order not found");

        const assignment = await assignDeliveryBoyToOrder(order);
        if (!assignment.assigned) {
            throw new Error(
                assignment.reason === "no-available-delivery-boy"
                    ? "No available delivery boy found at this time"
                    : "Order already has a delivery boy assigned"
            );
        }

        return NextResponse.json(
            {
                message: "Delivery boy assigned",
                deliveryId: assignment.deliveryId,
                deliveryBoyId: assignment.deliveryBoyId,
                deliveryBoyName: assignment.deliveryBoyName,
                otp: assignment.otp,          // ⚠ Send via SMS in production — returned here for dev
                orderId,
            },
            { status: 200 }
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Server error";
        console.error("Assign delivery error:", err);
        return NextResponse.json({ message }, { status: 400 });
    }
}
