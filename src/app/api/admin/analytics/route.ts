import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import { NextResponse } from "next/server";

const ALLOWED = ["admin", "superAdmin", "storeAdmin", "deliveryAdmin"];

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/analytics
//
// Returns aggregated sales data for the admin dashboard:
//   • totalRevenue, totalOrders, totalRefunds
//   • revenueByType  (online / offline / selfCheckout)
//   • revenueByDay   (last 30 days)
//   • topProducts    (top-10 by quantity sold)
//   • orderStatusBreakdown
// ────────────────────────────────────────────────────────────────────────────
export async function GET() {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !ALLOWED.includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }


    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
            summary,
            revenueByType,
            revenueByDay,
            topProducts,
            orderStatusBreakdown,
        ] = await Promise.all([

            // ── Overall summary ──────────────────────────────────────────────
            Order.aggregate([
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalRevenue: { $sum: { $cond: [{ $ne: ["$paymentStatus", "refunded"] }, "$totalAmount", 0] } },
                        totalRefunds: { $sum: { $cond: [{ $eq: ["$paymentStatus", "refunded"] }, "$totalAmount", 0] } },
                        refundCount: { $sum: { $cond: [{ $eq: ["$refundStatus", "approved"] }, 1, 0] } },
                    },
                },
            ]),

            // ── Revenue split by order type ──────────────────────────────────
            Order.aggregate([
                { $match: { paymentStatus: "paid" } },
                { $group: { _id: "$type", revenue: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
            ]),

            // ── Revenue per day (last 30 days) ───────────────────────────────
            Order.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo }, paymentStatus: "paid" } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        revenue: { $sum: "$totalAmount" },
                        orders: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),

            // ── Top 10 products by units sold ────────────────────────────────
            Order.aggregate([
                { $match: { paymentStatus: "paid" } },
                { $unwind: "$items" },
                {
                    $group: {
                        _id: "$items.groceryId",
                        name: { $first: "$items.name" },
                        totalQty: { $sum: "$items.quantity" },
                        totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                    },
                },
                { $sort: { totalQty: -1 } },
                { $limit: 10 },
            ]),

            // ── Order status breakdown ───────────────────────────────────────
            Order.aggregate([
                { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
            ]),
        ]);

        return NextResponse.json(
            {
                summary: summary[0] ?? {
                    totalOrders: 0, totalRevenue: 0, totalRefunds: 0, refundCount: 0,
                },
                revenueByType,
                revenueByDay,
                topProducts,
                orderStatusBreakdown,
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("Analytics error:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
