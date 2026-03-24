import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { rbac, resolveStoreAccess } from "@/lib/rbac";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// GET /api/store-admin/sales?store_id=<id>
//   Store-level analytics. storeAdmin: uses their own store from session.
//   Returns: { todayRevenue, todayOrders, weekRevenue, weekOrders, topProduct, selfCheckoutCount }
// ────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin", "storeAdmin"]);
    if (!check.ok) return check.response;

    const { storeId, response } = resolveStoreAccess(
        check.session,
        req.nextUrl.searchParams.get("store_id")
    );
    if (response) return response;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const matchBase: Record<string, unknown> = { paymentStatus: "paid" };
    if (storeId) matchBase.store_id = storeId as unknown;

    try {
        const [todayStat, weekStat, topProductStat, selfCheckoutCount] = await Promise.all([
            // Today
            Order.aggregate([
                { $match: { ...matchBase, createdAt: { $gte: todayStart } } },
                { $group: { _id: null, revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } },
            ]),
            // This week
            Order.aggregate([
                { $match: { ...matchBase, createdAt: { $gte: weekStart } } },
                { $group: { _id: null, revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } },
            ]),
            // Top product
            Order.aggregate([
                { $match: matchBase },
                { $unwind: "$items" },
                { $group: { _id: "$items.name", totalQty: { $sum: "$items.quantity" } } },
                { $sort: { totalQty: -1 } },
                { $limit: 1 },
            ]),
            // Self-checkout count
            Order.countDocuments({
                ...(storeId ? { store_id: storeId as unknown } : {}),
                type: "selfCheckout",
            }),
        ]);

        return NextResponse.json({
            todayRevenue: todayStat[0]?.revenue ?? 0,
            todayOrders: todayStat[0]?.orders ?? 0,
            weekRevenue: weekStat[0]?.revenue ?? 0,
            weekOrders: weekStat[0]?.orders ?? 0,
            topProduct: topProductStat[0]?._id ?? "—",
            selfCheckoutCount,
        }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
