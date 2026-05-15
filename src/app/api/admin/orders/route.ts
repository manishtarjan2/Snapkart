import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import Product from "@/models/product.model";
import StoreInventory from "@/models/store-inventory.model";
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

// Admin: PATCH → update order status (with inventory restore on cancellation)
export async function PATCH(req: NextRequest) {
    try {
        await connectDb();
        const session = await auth();
        const allowedRoles = ["admin", "storeAdmin", "superAdmin"];
        if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const { id, orderStatus } = await req.json();
        const order = await Order.findById(id);
        if (!order) {
            return NextResponse.json({ message: "Order not found" }, { status: 404 });
        }

        const prevStatus = order.orderStatus;
        order.orderStatus = orderStatus;

        // ── Restore inventory when cancelling an order ──────────────────────
        if (orderStatus === "cancelled" && prevStatus !== "cancelled" && prevStatus !== "refunded") {
            for (const item of order.items) {
                const productId = item.groceryId;
                let restored = false;

                if (order.store_id) {
                    const invResult = await StoreInventory.findOneAndUpdate(
                        { store_id: order.store_id, product_id: productId },
                        { $inc: { stock: item.quantity } }
                    );
                    if (invResult) restored = true;
                }

                if (!restored) {
                    await Product.findByIdAndUpdate(productId, {
                        $inc: { stock: item.quantity, sales: -item.quantity },
                        $set: { inStock: true },
                    });
                } else {
                    await Product.findByIdAndUpdate(productId, {
                        $inc: { sales: -item.quantity },
                        $set: { inStock: true },
                    });
                }
            }
        }

        await order.save();
        return NextResponse.json(order, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
