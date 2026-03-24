import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// POST /api/admin/refunds
//   Admin approves or rejects a refund request.
//
//   Body: { orderId, action: "approve" | "reject", reason? }
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !["admin", "superAdmin", "storeAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        const { orderId, action, reason } = await req.json();

        if (!orderId || !["approve", "reject"].includes(action)) {
            return NextResponse.json(
                { message: "orderId and action ('approve' | 'reject') are required" },
                { status: 400 }
            );
        }

        const order = await Order.findById(orderId);
        if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

        if (action === "approve") {
            order.refundStatus = "approved";
            order.paymentStatus = "refunded";
            order.orderStatus = "refunded";
        } else {
            order.refundStatus = "rejected";
            if (reason) order.refundReason = reason;
        }

        await order.save();

        return NextResponse.json(
            { message: `Refund ${action}d`, order },
            { status: 200 }
        );
    } catch (err) {
        console.error("Refund error:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/refunds  — list all orders with pending / processed refunds
// ────────────────────────────────────────────────────────────────────────────
export async function GET() {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !["admin", "superAdmin", "storeAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        const orders = await Order.find({
            refundStatus: { $in: ["requested", "approved", "rejected"] },
        })
            .populate("userId", "name email mobile")
            .sort({ updatedAt: -1 });

        return NextResponse.json(orders, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
