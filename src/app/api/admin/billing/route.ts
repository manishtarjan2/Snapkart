import { auth } from "@/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import Order from "@/models/order.model";
import Product from "@/models/product.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// POST /api/admin/billing  — record an offline (in-store) POS sale
//   • Admin-only
//   • Decrements product stock atomically inside a MongoDB transaction
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();

    const session = await auth();
    const allowedRoles = ["admin", "storeAdmin", "superAdmin"];
    if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
        items,
        customerName,
        customerPhone,
        totalAmount,
        subtotal,
        discount,
        tax,
        paymentMethod,
        cashPaid,
        store_id,   // optional: which store/branch processed this sale
    } = body;

    if (!items?.length) {
        return NextResponse.json({ message: "No items in bill" }, { status: 400 });
    }

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
        // 1️⃣  Validate & decrement stock for each line-item
        for (const item of items) {
            const product = await Product.findById(item.groceryId).session(mongoSession);

            if (!product) {
                throw new Error(`Product not found: ${item.groceryId}`);
            }
            if (product.stock < item.quantity) {
                throw new Error(
                    `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`
                );
            }

            const newStock = product.stock - item.quantity;
            await Product.findByIdAndUpdate(
                item.groceryId,
                {
                    $inc: { stock: -item.quantity },
                    $set: { isActive: newStock > 0 },
                },
                { session: mongoSession }
            );
        }

        // 2️⃣  Create an offline Order document
        const [order] = await Order.create(
            [
                {
                    userId: session.user.id,    // cashier / admin who billed the sale
                    items,
                    totalAmount,
                    paymentMethod,
                    paymentStatus: "paid",
                    orderStatus: "delivered",   // already handed to the customer
                    type: "offline",
                    ...(store_id && { store_id }),
                },
            ],
            { session: mongoSession }
        );

        await mongoSession.commitTransaction();

        return NextResponse.json(
            {
                message: "Sale recorded!",
                orderId: order._id.toString(),
                billNo: "BILL-" + order._id.toString().slice(-6).toUpperCase(),
                items,
                customerName,
                customerPhone,
                subtotal,
                discount,
                tax,
                totalAmount,
                paymentMethod,
                cashPaid,
                createdAt: order.createdAt,
            },
            { status: 201 }
        );
    } catch (err: unknown) {
        await mongoSession.abortTransaction();
        const message = err instanceof Error ? err.message : "Server error";
        console.error("Billing error:", err);
        const status = message.includes("Insufficient stock") ? 409 : 500;
        return NextResponse.json({ message }, { status });
    } finally {
        await mongoSession.endSession();
    }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/billing  — today's offline (POS) sales
// ────────────────────────────────────────────────────────────────────────────
export async function GET() {
    await connectDb();

    const session = await auth();
    const allowedRoles2 = ["admin", "storeAdmin", "superAdmin"];
    if (!session?.user?.role || !allowedRoles2.includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const orders = await Order.find({
            type: "offline",
            createdAt: { $gte: startOfDay },
        })
            .sort({ createdAt: -1 })
            .populate("store_id", "name address");

        return NextResponse.json(orders, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
