import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { rbac } from "@/lib/rbac";
import mongoose from "mongoose";
import Order from "@/models/order.model";
import Delivery from "@/models/delivery.model";
import DeliveryBoy from "@/models/deliveryboy.model";
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

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
        const order = await Order.findById(orderId).session(mongoSession);
        if (!order) throw new Error("Order not found");
        if (order.type !== "online") throw new Error("Only online orders can be assigned for delivery");
        if (order.deliveryBoyId) throw new Error("Order already assigned");

        const lat = order.address?.latitude;
        const lng = order.address?.longitude;

        let deliveryBoy = null;

        // Try geospatial first
        if (lat && lng) {
            deliveryBoy = await DeliveryBoy.findOne({
                status: "available",
                isActive: true,
                currentLocation: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [lng, lat] },
                        $maxDistance: 15000,
                    },
                },
            }).session(mongoSession);
        }

        // Fall back — least-busy available
        if (!deliveryBoy) {
            deliveryBoy = await DeliveryBoy.findOne({ status: "available", isActive: true })
                .sort({ totalDeliveries: 1 })
                .session(mongoSession);
        }

        if (!deliveryBoy) throw new Error("No available delivery boy");

        const otp = generateOtp();

        // Create Delivery tracking doc
        const [delivery] = await Delivery.create(
            [
                {
                    order_id: order._id,
                    delivery_boy_id: deliveryBoy._id,
                    store_id: order.store_id,
                    otp,
                    status: "assigned",
                },
            ],
            { session: mongoSession }
        );

        // Update Order
        order.deliveryBoyId = deliveryBoy._id as mongoose.Types.ObjectId;
        order.deliveryOtp = otp;
        order.orderStatus = "confirmed";
        await order.save({ session: mongoSession });

        // Mark delivery boy busy
        deliveryBoy.status = "busy";
        await deliveryBoy.save({ session: mongoSession });

        await mongoSession.commitTransaction();

        return NextResponse.json({
            message: "Assigned",
            deliveryId: delivery._id!.toString(),
            deliveryBoyName: deliveryBoy.name,
            phone: deliveryBoy.phone,
            otp,
        }, { status: 200 });
    } catch (err: unknown) {
        await mongoSession.abortTransaction();
        const msg = err instanceof Error ? err.message : "Server error";
        return NextResponse.json({ message: msg }, { status: 400 });
    } finally {
        await mongoSession.endSession();
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
            orderStatus: "placed",
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
