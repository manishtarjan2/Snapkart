import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Delivery from "@/models/delivery.model";
import DeliveryBoy from "@/models/deliveryboy.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/delivery/location
//
//   Delivery boy app pushes updated GPS coordinates in real-time.
//   Body: { latitude: number, longitude: number }
// ────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { latitude, longitude } = await req.json();

        if (typeof latitude !== "number" || typeof longitude !== "number") {
            return NextResponse.json(
                { message: "latitude and longitude (numbers) are required" },
                { status: 400 }
            );
        }

        // Find the DeliveryBoy profile linked to this user session
        const profile = await DeliveryBoy.findOneAndUpdate(
            { userId: session.user.id, isActive: true },
            {
                $set: {
                    currentLocation: {
                        type: "Point",
                        coordinates: [longitude, latitude], // GeoJSON: [lng, lat]
                    },
                },
            },
            { new: true }
        );

        if (!profile) {
            return NextResponse.json(
                { message: "Delivery boy profile not found or inactive" },
                { status: 404 }
            );
        }

        await Delivery.findOneAndUpdate(
            {
                delivery_boy_id: profile._id,
                status: { $in: ["assigned", "pickedUp", "inTransit"] },
            },
            {
                $set: {
                    live_location: {
                        type: "Point",
                        coordinates: [longitude, latitude],
                    },
                },
                $push: {
                    locationHistory: {
                        coordinates: [longitude, latitude],
                        recordedAt: new Date(),
                    },
                },
            },
            { new: true }
        );

        return NextResponse.json(
            { message: "Location updated", coordinates: [longitude, latitude] },
            { status: 200 }
        );
    } catch (err) {
        console.error("Location update error:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/delivery/location?orderId=<id>
//   Customer polls this endpoint to get the delivery boy's current position.
// ────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const orderId = req.nextUrl.searchParams.get("orderId");
    if (!orderId) {
        return NextResponse.json({ message: "orderId query param required" }, { status: 400 });
    }

    try {
        const { default: Order } = await import("@/models/order.model");
        const order = await Order.findById(orderId);
        if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

        // Only the customer who placed the order may track
        if (order.userId.toString() !== session.user.id && session.user.role !== "admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        if (!order.deliveryBoyId) {
            return NextResponse.json({ message: "No delivery boy assigned yet" }, { status: 404 });
        }

        const boy = await DeliveryBoy.findById(order.deliveryBoyId).select(
            "name phone currentLocation status vehicleType"
        );

        return NextResponse.json(boy, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
