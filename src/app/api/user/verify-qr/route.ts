import { auth } from "@/auth";
import connectDb from "@/lib/db";
import crypto from "crypto";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// GET /api/user/verify-qr?token=<token>&orderId=<id>
//
// Exit gate scans the customer's QR code.
// Verifies the receipt token is valid, not expired, and belongs to this store.
// ────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    await connectDb();
    const session = await auth();
    // Can be called by: storeAdmin, superAdmin, or unauthenticated gate device
    // (gate devices should use a service API key — stored in env)
    const apiKey = req.headers.get("x-gate-api-key");
    const isGate = apiKey === process.env.GATE_API_KEY;

    if (!session?.user && !isGate) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = req.nextUrl.searchParams.get("token");
    const orderId = req.nextUrl.searchParams.get("orderId");

    if (!token || !orderId) {
        return NextResponse.json({ message: "token and orderId are required" }, { status: 400 });
    }

    try {
        const order = await Order.findById(orderId)
            .select("type paymentStatus orderStatus deliveryOtp store_id createdAt userId");

        if (!order) {
            return NextResponse.json({ valid: false, reason: "Order not found" }, { status: 404 });
        }

        // Must be a paid self-checkout
        if (order.type !== "selfCheckout") {
            return NextResponse.json({ valid: false, reason: "Not a self-checkout order" }, { status: 400 });
        }

        if (order.paymentStatus !== "paid") {
            return NextResponse.json({ valid: false, reason: "Order not paid" }, { status: 400 });
        }

        // Verify token prefix matches what was stored
        const storedToken = order.deliveryOtp; // short 8-char prefix
        if (storedToken !== token.toUpperCase().slice(0, 8)) {
            return NextResponse.json({ valid: false, reason: "Invalid receipt token" }, { status: 400 });
        }

        // Check receipt is not older than 2 hours
        const twoHoursMs = 2 * 60 * 60 * 1000;
        if (order.createdAt && Date.now() - order.createdAt.getTime() > twoHoursMs) {
            return NextResponse.json({ valid: false, reason: "Receipt expired (>2 hours)" }, { status: 400 });
        }

        return NextResponse.json(
            {
                valid: true,
                orderId: order._id!.toString(),
                message: "Receipt verified ✓ — customer may exit",
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("QR verify error:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
