import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import DeliveryBoy from "@/models/deliveryboy.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// POST /api/delivery/otp-verify
//
//   Delivery boy submits the OTP the customer read out at the door.
//   On match: order → delivered, delivery boy → available, totalDeliveries++
//
//   Body: { orderId, otp }
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { orderId, otp } = await req.json();

        if (!orderId || !otp) {
            return NextResponse.json(
                { message: "orderId and otp are required" },
                { status: 400 }
            );
        }

        const order = await Order.findById(orderId);
        if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

        if (order.otpVerified) {
            return NextResponse.json({ message: "OTP already verified" }, { status: 409 });
        }

        if (order.deliveryOtp !== otp.toString().trim()) {
            return NextResponse.json({ message: "Invalid OTP" }, { status: 400 });
        }

        // ── Confirm delivery ─────────────────────────────────────────────────
        order.otpVerified = true;
        order.orderStatus = "delivered";
        order.paymentStatus = "paid";
        await order.save();

        // ── Free the delivery boy ─────────────────────────────────────────────
        if (order.deliveryBoyId) {
            await DeliveryBoy.findByIdAndUpdate(order.deliveryBoyId, {
                $set: { status: "available" },
                $inc: { totalDeliveries: 1 },
            });
        }

        return NextResponse.json(
            { message: "Delivery confirmed! OTP verified ✓" },
            { status: 200 }
        );
    } catch (err) {
        console.error("OTP verify error:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
