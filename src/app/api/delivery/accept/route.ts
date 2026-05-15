import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { reassignDeliveryBoyToOrder } from "@/lib/delivery";
import Delivery from "@/models/delivery.model";
import DeliveryBoy from "@/models/deliveryboy.model";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// POST /api/delivery/accept
//
//   Delivery boy accepts or rejects a pending delivery request.
//   Body: { deliveryId, action: "accept" | "reject" }
//
//   Accept: Delivery → "assigned", Order → "confirmed", DeliveryBoy → "busy"
//   Reject: Delivery → "cancelled", try reassign to next available rider
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { deliveryId, action } = await req.json();

        if (!deliveryId || !["accept", "reject"].includes(action)) {
            return NextResponse.json(
                { message: "deliveryId and action (accept/reject) required" },
                { status: 400 }
            );
        }

        // Verify the delivery boy profile
        const profile = await DeliveryBoy.findOne({ userId: session.user.id });
        if (!profile) {
            return NextResponse.json({ message: "Delivery boy profile not found" }, { status: 404 });
        }

        // Find the pending delivery
        const delivery = await Delivery.findById(deliveryId);
        if (!delivery) {
            return NextResponse.json({ message: "Delivery request not found" }, { status: 404 });
        }

        // Verify this delivery belongs to this delivery boy
        if (delivery.delivery_boy_id.toString() !== profile._id!.toString()) {
            return NextResponse.json({ message: "This delivery is not assigned to you" }, { status: 403 });
        }

        if (delivery.status !== "pending") {
            return NextResponse.json(
                { message: `Delivery is already ${delivery.status}` },
                { status: 409 }
            );
        }

        const order = await Order.findById(delivery.order_id);
        if (!order) {
            return NextResponse.json({ message: "Order not found" }, { status: 404 });
        }

        if (action === "accept") {
            // ── Accept the delivery ─────────────────────────────────────────
            delivery.status = "assigned";
            await delivery.save();

            order.orderStatus = "confirmed";
            await order.save();

            // Mark delivery boy as busy
            await DeliveryBoy.findByIdAndUpdate(profile._id, { status: "busy" });

            return NextResponse.json({
                message: "Order accepted! Pick up the order from the store.",
                delivery: {
                    _id: delivery._id,
                    status: delivery.status,
                    otp: delivery.otp,
                },
                order: {
                    _id: order._id,
                    orderStatus: order.orderStatus,
                    address: order.address,
                    items: order.items,
                    totalAmount: order.totalAmount,
                },
            });
        } else {
            // ── Reject the delivery ─────────────────────────────────────────
            delivery.status = "cancelled";
            await delivery.save();

            // Collect IDs of boys who already rejected this order
            const rejectedDeliveries = await Delivery.find({
                order_id: order._id,
                status: "cancelled",
            }).select("delivery_boy_id");

            const excludeIds = rejectedDeliveries.map((d: any) =>
                d.delivery_boy_id.toString()
            );

            // Try to reassign to the next available delivery boy
            const reassignment = await reassignDeliveryBoyToOrder(order, excludeIds);

            return NextResponse.json({
                message: "Order rejected",
                reassigned: reassignment.assigned,
                reassignedTo: reassignment.assigned
                    ? reassignment.deliveryBoyName
                    : null,
            });
        }
    } catch (err) {
        console.error("Accept/Reject delivery error:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
