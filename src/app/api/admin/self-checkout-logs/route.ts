import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import { NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/self-checkout-logs
//   Returns all self-checkout (scan-and-go) orders for the admin to review.
// ────────────────────────────────────────────────────────────────────────────
export async function GET() {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !["admin", "superAdmin", "storeAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        const logs = await Order.find({ type: "selfCheckout" })
            .populate("userId", "name email mobile")
            .populate("store_id", "name address.city")
            .sort({ createdAt: -1 });

        return NextResponse.json(logs, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
