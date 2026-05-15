import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { assignDeliveryBoyToOrder } from "@/lib/delivery";
import { rbac } from "@/lib/rbac";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/delivery-admin/assign
//   Find nearest available delivery boy → assign → create Delivery doc → OTP
//   Body: { orderId }
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin", "deliveryAdmin"]);
    if (!check.ok) return check.response;

    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ message: "orderId required" }, { status: 400 });

    // NOTE: Using individual atomic operations instead of transactions
    // to support standalone MongoDB (no replica set required).

    try {
        const order = await Order.findById(orderId);
        if (!order) throw new Error("Order not found");

        const assignment = await assignDeliveryBoyToOrder(order);
        if (!assignment.assigned) {
            throw new Error(assignment.reason === "no-available-delivery-boy" ? "No available delivery boy" : "Order could not be assigned");
        }

        return NextResponse.json({
            message: "Assigned",
            deliveryId: assignment.deliveryId,
            deliveryBoyId: assignment.deliveryBoyId,
            deliveryBoyName: assignment.deliveryBoyName,
            otp: assignment.otp,
        }, { status: 200 });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Server error";
        return NextResponse.json({ message: msg }, { status: 400 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/delivery-admin/assign  — list unassigned online orders
// ────────────────────────────────────────────────────────────────────────────
export async function GET() {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin", "deliveryAdmin"]);
    if (!check.ok) return check.response;

    try {
        const orders = await Order.find({
            type: "online",
            orderStatus: { $in: ["placed"] },
            deliveryBoyId: null,
        })
            .populate("userId", "name email mobile")
            .sort({ createdAt: 1 }) // oldest first
            .limit(100);

        return NextResponse.json(orders, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
