import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { rbac, resolveStoreAccess } from "@/lib/rbac";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// GET /api/store-admin/self-checkout-logs?store_id=<id>
//   Store-level self-checkout audit log.
//   Includes flagged (fraud-detected) orders at the top.
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

    const filter: Record<string, unknown> = { type: "selfCheckout" };
    if (storeId) filter.store_id = storeId;

    try {
        const logs = await Order.find(filter)
            .populate("userId", "name email mobile")
            .sort({ fraudFlagged: -1, createdAt: -1 }) // flagged first
            .limit(500);
        return NextResponse.json(logs, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
