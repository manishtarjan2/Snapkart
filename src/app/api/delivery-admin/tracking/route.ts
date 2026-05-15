import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { rbac } from "@/lib/rbac";
import Delivery from "@/models/delivery.model";
import DeliveryBoy from "@/models/deliveryboy.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// GET /api/delivery-admin/tracking
//   Returns { boys: [...], deliveries: [...] } for the DeliveryAdmin dashboard.
//   Pass ?boyId=<id> to filter to a specific delivery boy.
// ────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin", "deliveryAdmin"]);
    if (!check.ok) return check.response;

    const boyId = req.nextUrl.searchParams.get("boyId");

    try {
        // Fetch all active delivery boys
        const boysFilter: Record<string, unknown> = { isActive: true };
        if (boyId) boysFilter._id = boyId;
        const boys = await DeliveryBoy.find(boysFilter)
            .populate("store_id", "name address.city")
            .sort({ createdAt: -1 });

        // Fetch active deliveries
        const deliveryFilter: Record<string, unknown> = {
            status: { $in: ["pending", "assigned", "pickedUp", "inTransit"] },
        };
        if (boyId) deliveryFilter.delivery_boy_id = boyId;
        const deliveries = await Delivery.find(deliveryFilter)
            .populate("delivery_boy_id", "name phone vehicleType vehicleNumber")
            .populate("order_id", "userId address totalAmount items type")
            .sort({ assignedAt: -1 });

        return NextResponse.json({ boys, deliveries }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/delivery-admin/tracking
//   Admin updates a delivery boy's status (suspend / reactivate).
//   Body: { boyId, status: "available" | "busy" | "offline" }
// ────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin", "deliveryAdmin"]);
    if (!check.ok) return check.response;

    try {
        const { boyId, status } = await req.json();
        if (!boyId || !["available", "busy", "offline"].includes(status)) {
            return NextResponse.json({ message: "boyId and valid status required" }, { status: 400 });
        }
        const boy = await DeliveryBoy.findByIdAndUpdate(
            boyId,
            { status },
            { new: true }
        );
        if (!boy) return NextResponse.json({ message: "Delivery boy not found" }, { status: 404 });
        return NextResponse.json({ message: "Status updated", boy }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/delivery-admin/tracking
//   Admin adds a new delivery boy by creating / linking a User + DeliveryBoy profile.
//   Body: { action: "addBoy", userId?, name, phone, email?, vehicleType, vehicleNumber? }
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin", "deliveryAdmin"]);
    if (!check.ok) return check.response;

    try {
        const body = await req.json();
        const { action, name, phone, vehicleType, vehicleNumber, email, password } = body;

        if (action === "addBoy") {
            if (!name || !phone || !vehicleType) {
                return NextResponse.json({ message: "name, phone, vehicleType are required" }, { status: 400 });
            }

            // Use the admin/delivery-boys route logic
            const bcrypt = await import("bcryptjs");
            const User = (await import("@/models/user.model")).default;

            let user = email ? await User.findOne({ email }) : null;
            if (!user && email) {
                const hashedPw = password
                    ? await bcrypt.default.hash(password, 10)
                    : await bcrypt.default.hash(Math.random().toString(36).slice(-8), 10);
                user = await User.create({
                    name, email,
                    password: hashedPw,
                    mobile: phone,
                    role: "deliveryBoy",
                });
            } else if (user) {
                await User.findByIdAndUpdate(user._id, { role: "deliveryBoy", mobile: phone });
            }

            const profile = await DeliveryBoy.findOneAndUpdate(
                user ? { userId: user._id } : { name, phone },
                {
                    $set: {
                        name, phone,
                        vehicleType,
                        vehicleNumber: vehicleNumber || undefined,
                        isActive: true,
                        status: "available",
                        ...(user ? { userId: user._id } : {}),
                    },
                },
                { upsert: true, new: true }
            );

            return NextResponse.json({ message: "Delivery boy added", profile }, { status: 201 });
        }

        if (action === "getPerformance") {
            const [boyStats, flagged] = await Promise.all([
                DeliveryBoy.aggregate([
                    { $match: { isActive: true } },
                    {
                        $lookup: {
                            from: "deliveries",
                            localField: "_id",
                            foreignField: "delivery_boy_id",
                            as: "deliveries",
                        },
                    },
                    {
                        $project: {
                            name: 1, phone: 1, status: 1, vehicleType: 1, totalDeliveries: 1,
                            deliveredCount: {
                                $size: { $filter: { input: "$deliveries", cond: { $eq: ["$$this.status", "delivered"] } } },
                            },
                            failedCount: {
                                $size: { $filter: { input: "$deliveries", cond: { $eq: ["$$this.status", "failed"] } } },
                            },
                        },
                    },
                    { $sort: { deliveredCount: -1 } },
                ]),
                Delivery.find({ flagged: true }).populate("delivery_boy_id", "name phone"),
            ]);
            return NextResponse.json({ boyStats, flagged }, { status: 200 });
        }

        return NextResponse.json({ message: "Unknown action" }, { status: 400 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
