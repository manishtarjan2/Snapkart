import { auth } from "@/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import { assignDeliveryBoyToOrder } from "@/lib/delivery";
import Order from "@/models/order.model";
import StoreInventory from "@/models/store-inventory.model";
import Product from "@/models/product.model";
import Store from "@/models/store.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// POST /api/user/orders  — place an online order with atomic inventory sync
//
// Body: {
//   items: [{ groceryId, quantity }],
//   address: { fullName, phone, street, city, state, pincode, latitude?, longitude? },
//   totalAmount: number,
//   paymentMethod?: string,
//   store_id?: string,   // optional — auto-selected when available
// }
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();

    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if ((session.user as { isBlocked?: boolean }).isBlocked) {
        return NextResponse.json({ message: "Account is blocked" }, { status: 403 });
    }

    const body = await req.json();
    const { items, address, paymentMethod } = body;
    let { store_id } = body;

    if (!items?.length || !address) {
        return NextResponse.json(
            { message: "items and address are required" },
            { status: 400 }
        );
    }

    // Auto-select the first active store if none specified
    if (!store_id) {
        const defaultStore = await Store.findOne({ isActive: true }).select("_id").lean();
        if (defaultStore) {
            store_id = (defaultStore as { _id: mongoose.Types.ObjectId })._id.toString();
        }
    }

    // ── Enrich items with server-side pricing from Product ──────────────────
    const enrichedItems = [];
    let productTotal = 0;      // sum of discounted-price × qty
    let totalDiscount = 0;     // sum of monetary savings from product discounts

    for (const item of items) {
        const product = await Product.findById(item.groceryId);
        if (!product || !product.isActive) {
            return NextResponse.json(
                { message: `Product not found: ${item.groceryId}` },
                { status: 404 }
            );
        }
        const discountPct = product.discount ?? 0;
        const discountedPrice = product.price * (1 - discountPct / 100);
        const itemSavings = (product.price - discountedPrice) * item.quantity;

        enrichedItems.push({
            groceryId: item.groceryId,
            name: product.name,
            price: parseFloat(discountedPrice.toFixed(2)),
            quantity: item.quantity,
            image: product.image,
        });

        productTotal += discountedPrice * item.quantity;
        totalDiscount += itemSavings;
    }

    productTotal = parseFloat(productTotal.toFixed(2));
    totalDiscount = parseFloat(totalDiscount.toFixed(2));

    // ── Compute delivery fee (free delivery above ₹299) ────────────────────
    const deliveryFee = productTotal >= 299 ? 0 : 30;
    const grandTotal = parseFloat((productTotal + deliveryFee).toFixed(2));

    // ── Atomic operations: decrement stock + create Order ───────────────────
    try {
        for (const item of enrichedItems) {
            let deducted = false;
            if (store_id) {
                const invResult = await StoreInventory.findOneAndUpdate(
                    { store_id, product_id: item.groceryId, stock: { $gte: item.quantity } },
                    { $inc: { stock: -item.quantity } }
                );
                if (invResult) deducted = true;
            }

            if (!deducted) {
                const productResult = await Product.findOneAndUpdate(
                    { _id: item.groceryId, stock: { $gte: item.quantity } },
                    { $inc: { stock: -item.quantity, sales: item.quantity } },
                    { new: true }
                );
                if (!productResult) {
                    throw new Error(`Insufficient stock for "${item.name}"`);
                }
                if (productResult.stock <= 0) {
                    await Product.findByIdAndUpdate(
                        item.groceryId,
                        { $set: { inStock: false } }
                    );
                }
            } else {
                // Still bump sales on the product catalogue
                await Product.findByIdAndUpdate(
                    item.groceryId,
                    { $inc: { sales: item.quantity } }
                );
            }
        }

        const order = await Order.create({
            userId: session.user.id,
            items: enrichedItems,
            address,
            productTotal,
            deliveryFee,
            discountAmount: totalDiscount,
            totalAmount: grandTotal,
            paymentMethod: paymentMethod || "UPI",
            paymentStatus: paymentMethod === "COD" ? "pending" : "paid",
            orderStatus: "placed",
            type: "online",
            ...(store_id ? { store_id } : {}),
        });

        const assignment = await assignDeliveryBoyToOrder(order);

        return NextResponse.json(
            {
                message: "Order placed!",
                orderId: order._id!.toString(),
                totalAmount: grandTotal,
                productTotal,
                deliveryFee,
                discountAmount: totalDiscount,
                deliveryAssigned: assignment.assigned,
                deliveryInfo: assignment.assigned ? {
                    deliveryId: assignment.deliveryId,
                    deliveryBoyId: assignment.deliveryBoyId,
                    deliveryBoyName: assignment.deliveryBoyName,
                } : undefined,
            },
            { status: 201 }
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Server error";
        console.error("Place order error:", err);
        return NextResponse.json(
            { message },
            { status: message.includes("Insufficient") ? 409 : 500 }
        );
    }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/user/orders  — customer's order history
// ────────────────────────────────────────────────────────────────────────────
export async function GET() {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const orders = await Order.find({ userId: session.user.id })
            .sort({ createdAt: -1 })
            .populate("store_id", "name address.city");
        return NextResponse.json(orders, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
