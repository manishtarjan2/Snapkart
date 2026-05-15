import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// GET /api/user/settings — full user profile + order stats
// ────────────────────────────────────────────────────────────────────────────
export async function GET() {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await User.findById(session.user.id).lean() as any;
        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Order stats
        const [orderStats] = await Order.aggregate([
            { $match: { userId: user._id } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: "$totalAmount" },
                    deliveredOrders: {
                        $sum: { $cond: [{ $eq: ["$orderStatus", "delivered"] }, 1, 0] },
                    },
                    pendingOrders: {
                        $sum: {
                            $cond: [
                                { $in: ["$orderStatus", ["placed", "confirmed", "outForDelivery"]] },
                                1,
                                0,
                            ],
                        },
                    },
                    cancelledOrders: {
                        $sum: { $cond: [{ $eq: ["$orderStatus", "cancelled"] }, 1, 0] },
                    },
                    lastOrderDate: { $max: "$createdAt" },
                },
            },
        ]);

        return NextResponse.json({
            user: {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                mobile: user.mobile || "",
                role: user.role,
                image: user.image || null,
                isBlocked: user.isBlocked,
                createdAt: (user as any).createdAt,
                updatedAt: (user as any).updatedAt,
            },
            stats: orderStats || {
                totalOrders: 0,
                totalSpent: 0,
                deliveredOrders: 0,
                pendingOrders: 0,
                cancelledOrders: 0,
                lastOrderDate: null,
            },
        });
    } catch (err) {
        console.error("Settings GET error:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/user/settings — update user profile
// ────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const allowedFields = ["name", "mobile", "image"];
        const updates: Record<string, any> = {};

        for (const key of allowedFields) {
            if (body[key] !== undefined) {
                updates[key] = body[key];
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ message: "No valid fields to update" }, { status: 400 });
        }

        const user = await User.findByIdAndUpdate(
            session.user.id,
            { $set: updates },
            { new: true }
        );

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            message: "Profile updated ✓",
            user: {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                mobile: user.mobile || "",
                role: user.role,
                image: user.image || null,
            },
        });
    } catch (err) {
        console.error("Settings PATCH error:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
