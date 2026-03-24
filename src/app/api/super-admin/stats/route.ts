import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { rbac } from "@/lib/rbac";
import User from "@/models/user.model";
import Store from "@/models/store.model";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// ────────────────────────────────────────────────────────────────────────────
// GET /api/super-admin/stats  — global revenue, per-branch performance
// ────────────────────────────────────────────────────────────────────────────
export async function GET() {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin"]);
    if (!check.ok) return check.response;

    try {
        const [globalRevenue, perBranch, userCounts, topStores] = await Promise.all([
            // Total revenue & order counts
            Order.aggregate([
                { $match: { paymentStatus: "paid" } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$totalAmount" },
                        totalOrders: { $sum: 1 },
                        avgOrderValue: { $avg: "$totalAmount" },
                    },
                },
            ]),

            // Revenue per store branch
            Order.aggregate([
                { $match: { paymentStatus: "paid", store_id: { $ne: null } } },
                {
                    $group: {
                        _id: "$store_id",
                        revenue: { $sum: "$totalAmount" },
                        orders: { $sum: 1 },
                    },
                },
                {
                    $lookup: {
                        from: "stores",
                        localField: "_id",
                        foreignField: "_id",
                        as: "store",
                    },
                },
                { $unwind: "$store" },
                { $sort: { revenue: -1 } },
            ]),

            // User role distribution
            User.aggregate([
                { $group: { _id: "$role", count: { $sum: 1 } } },
            ]),

            // Top 5 stores by revenue (for branch performance)
            Store.find({ isActive: true })
                .select("name address.city commission deliveryRadiusKm")
                .limit(5),
        ]);

        return NextResponse.json({
            globalRevenue: globalRevenue[0] ?? { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 },
            perBranch,
            userCounts,
            topStores,
        }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/super-admin/stats  — used to update global pricing rules
//   Body: { action: "updateCommission", storeId, commission }
//       | { action: "updateDeliveryZone", storeId, deliveryRadiusKm }
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin"]);
    if (!check.ok) return check.response;

    try {
        const body = await req.json();
        const { action, storeId } = body;

        if (action === "updateCommission") {
            const store = await Store.findByIdAndUpdate(
                storeId,
                { commission: body.commission },
                { new: true }
            );
            return NextResponse.json({ message: "Commission updated", store }, { status: 200 });
        }

        if (action === "updateDeliveryZone") {
            const store = await Store.findByIdAndUpdate(
                storeId,
                { deliveryRadiusKm: body.deliveryRadiusKm },
                { new: true }
            );
            return NextResponse.json({ message: "Delivery zone updated", store }, { status: 200 });
        }

        if (action === "createAdmin") {
            const { name, email, password, role, store_id } = body;
            const allowedAdminRoles = ["storeAdmin", "productAdmin", "deliveryAdmin", "posAdmin"];

            if (!allowedAdminRoles.includes(role)) {
                return NextResponse.json({ message: "Invalid admin role" }, { status: 400 });
            }

            const hashed = await bcrypt.hash(password, 10);
            const user = await User.create({
                name, email,
                password: hashed,
                role,
                store_id: store_id ?? null,
            });

            // If storeAdmin, set as manager_id on the store
            if (role === "storeAdmin" && store_id) {
                await Store.findByIdAndUpdate(store_id, { manager_id: user._id });
            }

            return NextResponse.json({ message: "Admin created", userId: user._id }, { status: 201 });
        }

        return NextResponse.json({ message: "Unknown action" }, { status: 400 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
