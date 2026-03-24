import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

// Admin: GET all orders
export async function GET() {
    try {
        await connectDb();
        const session = await auth();
        const allowedRoles = ["admin", "storeAdmin", "superAdmin"];
        if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }
        const orders = await Order.find({}).sort({ createdAt: -1 }).populate("userId", "name email mobile");
        return NextResponse.json(orders, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// Admin: PATCH → update order status
export async function PATCH(req: NextRequest) {
    try {
        await connectDb();
        const session = await auth();
        const allowedRoles2 = ["admin", "storeAdmin", "superAdmin"];
        if (!session?.user?.role || !allowedRoles2.includes(session.user.role)) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }
        const { id, orderStatus } = await req.json();
        const order = await Order.findByIdAndUpdate(id, { orderStatus }, { new: true });
        return NextResponse.json(order, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
