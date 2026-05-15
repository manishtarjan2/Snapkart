import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import Delivery from "@/models/delivery.model";
import DeliveryBoy from "@/models/deliveryboy.model";
import Product from "@/models/product.model";
import StoreInventory from "@/models/store-inventory.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// GET /api/delivery/orders
//   Returns only the orders assigned to the logged-in delivery boy.
//   Admins can pass ?all=true to see every pending delivery order.
// ────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const showAll = req.nextUrl.searchParams.get("all") === "true";

        let filter: Record<string, unknown>;

        const adminRoles = ["admin", "storeAdmin", "superAdmin", "deliveryAdmin"];
        if (showAll && adminRoles.includes(session.user.role)) {
            // Admin: all active delivery orders
            filter = {
                type: "online",
                orderStatus: { $in: ["placed", "pendingAcceptance", "confirmed", "outForDelivery"] },
            };
        } else {
            // Delivery boy: only their own assignments
            const profile = await DeliveryBoy.findOne({ userId: session.user.id });
            if (!profile) {
                // Profile not yet created — return empty list gracefully
                return NextResponse.json([], { status: 200 });
            }
            filter = {
                deliveryBoyId: profile._id,
                orderStatus: { $in: ["confirmed", "outForDelivery"] },
            };
        }

        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .populate("userId", "name mobile")
            .populate("store_id", "name address");

        return NextResponse.json(orders, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/delivery/orders
//   Delivery boy updates the order status (confirmed → outForDelivery, etc.)
//   Body: { orderId, orderStatus }
// ────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { orderId, orderStatus } = await req.json();
        const allowed = ["confirmed", "outForDelivery", "cancelled"];

        if (!orderId || !allowed.includes(orderStatus)) {
            return NextResponse.json(
                { message: orderStatus === "delivered"
                    ? "Use OTP verification to mark as delivered"
                    : "Invalid request" },
                { status: 400 }
            );
        }

        const order = await Order.findById(orderId);
        if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

        // Verify this delivery boy owns this order (unless admin/deliveryAdmin)
        const adminRoles = ["admin", "storeAdmin", "superAdmin", "deliveryAdmin"];
        if (!adminRoles.includes(session.user.role)) {
            const profile = await DeliveryBoy.findOne({ userId: session.user.id });
            if (!profile || order.deliveryBoyId?.toString() !== profile._id!.toString()) {
                return NextResponse.json({ message: "Forbidden" }, { status: 403 });
            }
        }

        order.orderStatus = orderStatus;

        const updates = [] as Promise<unknown>[];
        if (order.deliveryBoyId) {
            if (orderStatus === "outForDelivery") {
                updates.push(
                    Delivery.findOneAndUpdate(
                        { order_id: order._id },
                        { status: "pickedUp" },
                        { new: true }
                    )
                );
            }

            if (orderStatus === "cancelled") {
                updates.push(
                    Delivery.findOneAndUpdate(
                        { order_id: order._id },
                        { status: "cancelled" },
                        { new: true }
                    )
                );
                updates.push(
                    DeliveryBoy.findByIdAndUpdate(order.deliveryBoyId, {
                        $set: { status: "available" },
                    })
                );

                // ── Restore inventory on cancellation ──────────────────────
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
        }

        await Promise.all([order.save(), ...updates]);

        return NextResponse.json(order, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
