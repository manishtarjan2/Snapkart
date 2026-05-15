import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import Product from "@/models/product.model";
import StoreInventory from "@/models/store-inventory.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// POST /api/admin/refunds
//   Admin approves or rejects a refund request.
//
//   Body: { orderId, action: "approve" | "reject", reason? }
//
//   REFUND POLICY:
//   ─ Only the PRODUCT total is refunded (sum of item price × qty).
//   ─ Delivery charges are NOT refunded.
//   ─ Offer / coupon discounts are NOT refunded (customer already paid less).
//   ─ On approval, inventory stock is restored automatically.
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !["admin", "superAdmin", "storeAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        const { orderId, action, reason } = await req.json();

        if (!orderId || !["approve", "reject"].includes(action)) {
            return NextResponse.json(
                { message: "orderId and action ('approve' | 'reject') are required" },
                { status: 400 }
            );
        }

        const order = await Order.findById(orderId);
        if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

        if (order.refundStatus !== "requested") {
            return NextResponse.json(
                { message: `Cannot process refund — current status is "${order.refundStatus}"` },
                { status: 409 }
            );
        }

        if (action === "approve") {
            // ── Calculate refund amount ─────────────────────────────────────
            // Refund = productTotal (item prices × qty AFTER product discount)
            // We do NOT refund deliveryFee or offer/coupon discountAmount
            const refundAmount = order.productTotal
                ? order.productTotal
                : order.items.reduce(
                    (sum: number, item: { price: number; quantity: number }) =>
                        sum + item.price * item.quantity,
                    0
                );

            order.refundStatus = "approved";
            order.refundAmount = parseFloat(refundAmount.toFixed(2));
            order.paymentStatus = "refunded";
            order.orderStatus = "refunded";

            // ── Restore inventory stock ─────────────────────────────────────
            for (const item of order.items) {
                const productId = item.groceryId;
                let restored = false;

                // Try restoring to StoreInventory first
                if (order.store_id) {
                    const invResult = await StoreInventory.findOneAndUpdate(
                        { store_id: order.store_id, product_id: productId },
                        { $inc: { stock: item.quantity } }
                    );
                    if (invResult) restored = true;
                }

                // Fallback: restore directly to Product.stock
                if (!restored) {
                    await Product.findByIdAndUpdate(productId, {
                        $inc: { stock: item.quantity, sales: -item.quantity },
                        $set: { inStock: true },
                    });
                } else {
                    // Revert sales count on product catalogue
                    await Product.findByIdAndUpdate(productId, {
                        $inc: { sales: -item.quantity },
                        $set: { inStock: true },
                    });
                }
            }
        } else {
            order.refundStatus = "rejected";
            if (reason) order.refundReason = reason;
        }

        await order.save();

        return NextResponse.json(
            {
                message: `Refund ${action}d`,
                orderId: order._id,
                refundAmount: order.refundAmount ?? 0,
                refundStatus: order.refundStatus,
                note: action === "approve"
                    ? `₹${order.refundAmount?.toFixed(2)} refunded (product cost only — delivery charges ₹${order.deliveryFee ?? 0} and discount ₹${order.discountAmount ?? 0} are not refundable)`
                    : undefined,
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("Refund error:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/refunds  — list all orders with pending / processed refunds
// ────────────────────────────────────────────────────────────────────────────
export async function GET() {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !["admin", "superAdmin", "storeAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        const orders = await Order.find({
            refundStatus: { $in: ["requested", "approved", "rejected"] },
        })
            .populate("userId", "name email mobile")
            .sort({ updatedAt: -1 });

        return NextResponse.json(orders, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
