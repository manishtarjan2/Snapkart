import { auth } from "@/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import crypto from "crypto";
import Order from "@/models/order.model";
import StoreInventory from "@/models/store-inventory.model";
import Product from "@/models/product.model";
import { runFraudChecks } from "@/lib/self-checkout-guard";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// POST /api/user/self-checkout
//
// Self-Scan & Self-Pay flow:
//   1. Client sends scanned items + payment info
//   2. Server verifies prices against DB
//   3. Fraud checks (geofence, tamper, velocity, bulk)
//   4. Atomic stock decrement (StoreInventory)
//   5. Order created with type: "selfCheckout"
//   6. QR receipt token generated
//
// Body: {
//   items: [{ groceryId, quantity }],
//   store_id: string,
//   paymentMethod: string,
//   clientTotal: number,
//   clientLatitude?: number,
//   clientLongitude?: number,
// }
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if ((session.user as { isBlocked?: boolean }).isBlocked) {
        return NextResponse.json({ message: "Account blocked" }, { status: 403 });
    }

    const body = await req.json();
    const {
        items,
        store_id,
        paymentMethod,
        clientTotal,
        clientLatitude,
        clientLongitude,
    } = body;

    if (!items?.length || !store_id || !clientTotal) {
        return NextResponse.json(
            { message: "items, store_id and clientTotal are required" },
            { status: 400 }
        );
    }

    // ── 1. Build enriched items from DB ──────────────────────────────────────
    const enrichedItems = [];
    let serverTotal = 0;

    for (const item of items) {
        const product = await Product.findById(item.groceryId);
        if (!product || !product.isActive) {
            return NextResponse.json(
                { message: `Product not found or inactive: ${item.groceryId}` },
                { status: 404 }
            );
        }

        const inv = await StoreInventory.findOne({
            store_id,
            product_id: item.groceryId,
        });

        if (!inv || inv.stock < item.quantity) {
            return NextResponse.json(
                { message: `Insufficient stock for ${product.name}` },
                { status: 409 }
            );
        }

        const price = inv.priceOverride ?? product.price;
        const discountedPrice = price * (1 - (product.discount ?? 0) / 100);

        enrichedItems.push({
            groceryId: item.groceryId,
            name: product.name,
            price: parseFloat(discountedPrice.toFixed(2)),
            quantity: item.quantity,
            image: product.image,
        });

        serverTotal += discountedPrice * item.quantity;
    }

    serverTotal = parseFloat(serverTotal.toFixed(2));

    // ── 2. Count recent self-checkouts for velocity check ────────────────────
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await Order.countDocuments({
        userId: session.user.id,
        type: "selfCheckout",
        createdAt: { $gte: oneHourAgo },
    });

    // ── 3. Fraud detection ───────────────────────────────────────────────────
    const fraudReport = runFraudChecks({
        userId: session.user.id,
        items: enrichedItems,
        totalAmount: serverTotal,
        clientTotal: Number(clientTotal),
        clientLatitude,
        clientLongitude,
        recentOrderCount: recentCount,
    });

    if (fraudReport.shouldBlock) {
        return NextResponse.json(
            {
                message: "Self-checkout blocked by fraud detection",
                reasons: fraudReport.failures.map((f) => f.reason),
            },
            { status: 422 }
        );
    }

    // ── 4. Atomic stock decrement + Order creation ────────────────────────────
    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
        for (const item of enrichedItems) {
            const result = await StoreInventory.findOneAndUpdate(
                {
                    store_id,
                    product_id: item.groceryId,
                    stock: { $gte: item.quantity }, // atomic guard
                },
                { $inc: { stock: -item.quantity } },
                { session: mongoSession }
            );

            if (!result) {
                throw new Error(`Race condition: stock depleted for ${item.name}`);
            }
        }

        // ── 5. Generate QR receipt token ─────────────────────────────────────
        const receiptToken = crypto
            .createHash("sha256")
            .update(`${session.user.id}:${Date.now()}:${Math.random()}`)
            .digest("hex");

        const [order] = await Order.create(
            [
                {
                    userId: session.user.id,
                    items: enrichedItems,
                    totalAmount: serverTotal,
                    paymentMethod: paymentMethod || "UPI",
                    paymentStatus: "paid",
                    orderStatus: "delivered",
                    type: "selfCheckout",
                    store_id,
                    // Store the receipt token and fraud flag in a dedicated field
                    deliveryOtp: receiptToken.slice(0, 8).toUpperCase(), // short token
                    ...(fraudReport.shouldFlag && { refundReason: "Fraud flag: " + fraudReport.failures.map((f) => f.reason).join("; ") }),
                },
            ],
            { session: mongoSession }
        );

        await mongoSession.commitTransaction();

        return NextResponse.json(
            {
                message: "Self-checkout complete ✓",
                orderId: order._id!.toString(),
                receiptToken: receiptToken.slice(0, 8).toUpperCase(),
                // Include full token in QR data
                qrData: JSON.stringify({
                    orderId: order._id!.toString(),
                    token: receiptToken,
                    storeId: store_id,
                    total: serverTotal,
                    ts: Date.now(),
                }),
                totalAmount: serverTotal,
                flagged: fraudReport.shouldFlag,
                flagReasons: fraudReport.shouldFlag
                    ? fraudReport.failures.map((f) => f.reason)
                    : [],
            },
            { status: 201 }
        );
    } catch (err: unknown) {
        await mongoSession.abortTransaction();
        const msg = err instanceof Error ? err.message : "Server error";
        console.error("Self-checkout error:", err);
        return NextResponse.json({ message: msg }, { status: 500 });
    } finally {
        await mongoSession.endSession();
    }
}
