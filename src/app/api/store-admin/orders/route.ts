import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { rbac, resolveStoreAccess } from "@/lib/rbac";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// GET /api/store-admin/orders?store_id=<id>&status=<status>
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

    const status = req.nextUrl.searchParams.get("status");
    const filter: Record<string, unknown> = {};
    if (storeId) filter.store_id = storeId;
    if (status) filter.orderStatus = status;

    try {
        const orders = await Order.find(filter)
            .populate("userId", "name email mobile")
            .populate("deliveryBoyId", "name phone")
            .sort({ createdAt: -1 })
            .limit(200);
        return NextResponse.json(orders, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
