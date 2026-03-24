import { auth } from "@/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import Order from "@/models/order.model";
import DeliveryBoy from "@/models/deliveryboy.model";
import { NextRequest, NextResponse } from "next/server";

/** Generate a 6-digit numeric OTP */
function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/delivery/assign
//
//   Called by admin (or auto-trigger) after an order is placed.
//   Finds the nearest AVAILABLE delivery boy and assigns the order.
//   Also generates the delivery OTP for doorstep confirmation.
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

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
        const order = await Order.findById(orderId).session(mongoSession);
        if (!order) throw new Error("Order not found");
        if (order.deliveryBoyId) throw new Error("Order already has a delivery boy assigned");

        // ── Find nearest available delivery boy ──────────────────────────────
        // If the order has customer coordinates, use $near; otherwise first
        // available globally.
        let deliveryBoy = null;

        const lat = order.address?.latitude;
        const lng = order.address?.longitude;

        if (lat && lng) {
            deliveryBoy = await DeliveryBoy.findOne({
                status: "available",
                isActive: true,
                currentLocation: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [lng, lat] },
                        $maxDistance: 15000, // 15 km radius
                    },
                },
            }).session(mongoSession);
        }

        // Fall back to any available delivery boy
        if (!deliveryBoy) {
            deliveryBoy = await DeliveryBoy.findOne({
                status: "available",
                isActive: true,
            })
                .session(mongoSession)
                .sort({ totalDeliveries: 1 }); // prefer least-busy
        }

        if (!deliveryBoy) {
            throw new Error("No available delivery boy found at this time");
        }

        const otp = generateOtp();

        // ── Update order ─────────────────────────────────────────────────────
        order.deliveryBoyId = deliveryBoy._id as mongoose.Types.ObjectId;
        order.deliveryOtp = otp;
        order.orderStatus = "confirmed";
        await order.save({ session: mongoSession });

        // ── Mark delivery boy as busy ─────────────────────────────────────────
        deliveryBoy.status = "busy";
        await deliveryBoy.save({ session: mongoSession });

        await mongoSession.commitTransaction();

        return NextResponse.json(
            {
                message: "Delivery boy assigned",
                deliveryBoyId: deliveryBoy._id!.toString(),
                deliveryBoyName: deliveryBoy.name,
                phone: deliveryBoy.phone,
                otp,          // ⚠ Send via SMS in production — returned here for dev
                orderId,
            },
            { status: 200 }
        );
    } catch (err: unknown) {
        await mongoSession.abortTransaction();
        const message = err instanceof Error ? err.message : "Server error";
        console.error("Assign delivery error:", err);
        return NextResponse.json({ message }, { status: 400 });
    } finally {
        await mongoSession.endSession();
    }
}
