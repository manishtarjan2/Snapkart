import { auth } from "@/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
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

    // Auto-select the first active store if none specified (optional — order
    // can proceed even without a store if none have been created yet)
    if (!store_id) {
        const defaultStore = await Store.findOne({ isActive: true }).select("_id").lean();
        if (defaultStore) {
            store_id = (defaultStore as { _id: mongoose.Types.ObjectId })._id.toString();
        }
        // store_id stays undefined — order proceeds without a store link
    }

    // ── Enrich items with server-side pricing from Product ──────────────────
    const enrichedItems = [];
    let serverTotal = 0;

    for (const item of items) {
        const product = await Product.findById(item.groceryId);
        if (!product || !product.isActive) {
            return NextResponse.json(
                { message: `Product not found: ${item.groceryId}` },
                { status: 404 }
            );
        }
        const priceToUse = product.price * (1 - (product.discount ?? 0) / 100);
        enrichedItems.push({
            groceryId: item.groceryId,
            name: product.name,
            price: parseFloat(priceToUse.toFixed(2)),
            quantity: item.quantity,
            image: product.image,
        });
        serverTotal += priceToUse * item.quantity;
    }

    serverTotal = parseFloat(serverTotal.toFixed(2));

    // ── Atomic transaction: decrement StoreInventory + create Order ───────────
    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
        for (const item of enrichedItems) {
            // 1. Try decrementing StoreInventory first (if store+inventory exists)
            let deducted = false;
            if (store_id) {
                const invResult = await StoreInventory.findOneAndUpdate(
                    { store_id, product_id: item.groceryId, stock: { $gte: item.quantity } },
                    { $inc: { stock: -item.quantity } },
                    { session: mongoSession }
                );
                if (invResult) deducted = true;
            }

            // 2. Fallback: deduct directly from Product.stock
            if (!deducted) {
                const productResult = await Product.findOneAndUpdate(
                    { _id: item.groceryId, stock: { $gte: item.quantity } },
                    { $inc: { stock: -item.quantity } },
                    { session: mongoSession, new: true }
                );
                if (!productResult) {
                    throw new Error(`Insufficient stock for "${item.name}"`);
                }
                // Mark product out-of-stock if fully depleted
                if (productResult.stock <= 0) {
                    await Product.findByIdAndUpdate(
                        item.groceryId,
                        { $set: { inStock: false } },
                        { session: mongoSession }
                    );
                }
            }
        }

        const [order] = await Order.create(
            [
                {
                    userId: session.user.id,
                    items: enrichedItems,
                    address,
                    totalAmount: serverTotal,
                    paymentMethod: paymentMethod || "UPI",
                    paymentStatus: "paid",
                    orderStatus: "placed",
                    type: "online",
                    ...(store_id ? { store_id } : {}),
                },
            ],
            { session: mongoSession }
        );

        await mongoSession.commitTransaction();

        return NextResponse.json(
            { message: "Order placed!", orderId: order._id!.toString(), totalAmount: serverTotal },
            { status: 201 }
        );
    } catch (err: unknown) {
        await mongoSession.abortTransaction();
        const message = err instanceof Error ? err.message : "Server error";
        console.error("Place order error:", err);
        return NextResponse.json(
            { message },
            { status: message.includes("Insufficient") ? 409 : 500 }
        );
    } finally {
        await mongoSession.endSession();
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
