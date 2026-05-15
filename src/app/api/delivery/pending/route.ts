import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Delivery from "@/models/delivery.model";
import DeliveryBoy from "@/models/deliveryboy.model";
import Order from "@/models/order.model";
import { NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// GET /api/delivery/pending
//
//   Returns pending delivery requests for the logged-in delivery boy.
//   These are orders awaiting acceptance. The delivery boy sees them as
//   incoming notifications they can Accept or Reject.
// ────────────────────────────────────────────────────────────────────────────
export async function GET() {
    await connectDb();
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const profile = await DeliveryBoy.findOne({ userId: session.user.id });
        if (!profile) {
            return NextResponse.json([], { status: 200 });
        }

        // Find pending deliveries assigned to this delivery boy
        const pendingDeliveries = await Delivery.find({
            delivery_boy_id: profile._id,
            status: "pending",
        })
            .sort({ assignedAt: -1 })
            .lean();

        // Fetch the corresponding orders with full details
        const orderIds = pendingDeliveries.map((d: any) => d.order_id);
        const orders = await Order.find({ _id: { $in: orderIds } })
            .populate("userId", "name mobile")
            .populate("store_id", "name address")
            .lean();

        // Map orders into the response with delivery info attached
        const result = pendingDeliveries.map((delivery: any) => {
            const order = orders.find(
                (o: any) => o._id.toString() === delivery.order_id.toString()
            );
            return {
                deliveryId: delivery._id,
                assignedAt: delivery.assignedAt,
                order: order
                    ? {
                          _id: order._id,
                          userId: order.userId,
                          items: order.items,
                          address: order.address,
                          totalAmount: order.totalAmount,
                          productTotal: order.productTotal,
                          deliveryFee: order.deliveryFee,
                          paymentMethod: order.paymentMethod,
                          createdAt: order.createdAt,
                          store_id: order.store_id,
                      }
                    : null,
            };
        });

        return NextResponse.json(result, { status: 200 });
    } catch (err) {
        console.error("Pending deliveries error:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
