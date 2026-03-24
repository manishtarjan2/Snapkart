import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// POST /api/user/refund-request
//   Customer requests a refund for a delivered order.
//   Body: { orderId, reason }
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { orderId, reason } = await req.json();
        if (!orderId) {
            return NextResponse.json({ message: "orderId is required" }, { status: 400 });
        }

        const order = await Order.findById(orderId);
        if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

        // Only the original customer can request a refund
        if (order.userId.toString() !== session.user.id) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        if (order.paymentStatus !== "paid") {
            return NextResponse.json(
                { message: "Only paid orders can be refunded" },
                { status: 400 }
            );
        }

        if (order.refundStatus && order.refundStatus !== "none") {
            return NextResponse.json(
                { message: `Refund already ${order.refundStatus}` },
                { status: 409 }
            );
        }

        order.refundStatus = "requested";
        order.refundReason = reason || "Customer requested";
        await order.save();

        return NextResponse.json(
            { message: "Refund request submitted. Admin will review shortly." },
            { status: 200 }
        );
    } catch (err) {
        console.error("Refund request error:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
