import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import Order from "@/models/order.model";
import Product from "@/models/product.model";
import StoreInventory from "@/models/store-inventory.model";
import Store from "@/models/store.model";
import { assignDeliveryBoyToOrder } from "@/lib/delivery";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        await connectDb();
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            address,
            items,
            totalAmount,
            paymentMethod
        } = await req.json();

        // Verify payment signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature !== expectedSign) {
            return NextResponse.json({ message: "Payment verification failed" }, { status: 400 });
        }

        // ── Auto-select store ──────────────────────────────────────────────
        let store_id: string | undefined;
        const defaultStore = await Store.findOne({ isActive: true }).select("_id").lean();
        if (defaultStore) {
            store_id = (defaultStore as { _id: mongoose.Types.ObjectId })._id.toString();
        }

        // ── Enrich items with server-side pricing & compute breakdown ──────
        const enrichedItems = [];
        let productTotal = 0;
        let totalDiscount = 0;

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
                name: item.name || product.name,
                price: parseFloat(discountedPrice.toFixed(2)),
                quantity: item.quantity,
                image: item.image || product.image,
            });

            productTotal += discountedPrice * item.quantity;
            totalDiscount += itemSavings;
        }

        productTotal = parseFloat(productTotal.toFixed(2));
        totalDiscount = parseFloat(totalDiscount.toFixed(2));

        const deliveryFee = productTotal >= 299 ? 0 : 30;
        const grandTotal = parseFloat((productTotal + deliveryFee).toFixed(2));

        // ── Deduct inventory atomically ────────────────────────────────────
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
                    return NextResponse.json(
                        { message: `Insufficient stock for "${item.name}"` },
                        { status: 409 }
                    );
                }
                if (productResult.stock <= 0) {
                    await Product.findByIdAndUpdate(item.groceryId, { $set: { inStock: false } });
                }
            } else {
                await Product.findByIdAndUpdate(
                    item.groceryId,
                    { $inc: { sales: item.quantity } }
                );
            }
        }

        // ── Create the order in database ───────────────────────────────────
        const order = await Order.create({
            userId: session.user.id,
            items: enrichedItems,
            address,
            productTotal,
            deliveryFee,
            discountAmount: totalDiscount,
            totalAmount: grandTotal,
            paymentMethod: paymentMethod || "RAZORPAY",
            paymentStatus: "paid",
            orderStatus: "placed",
            type: "online",
            ...(store_id ? { store_id } : {}),
        });

        // Auto-assign a delivery boy after successful payment
        const assignment = await assignDeliveryBoyToOrder(order);

        return NextResponse.json({
            message: "Payment successful and order placed!",
            orderId: order._id.toString(),
            paymentId: razorpay_payment_id,
            totalAmount: grandTotal,
            productTotal,
            deliveryFee,
            discountAmount: totalDiscount,
            deliveryAssigned: assignment.assigned,
            deliveryInfo: assignment.assigned ? {
                deliveryBoyName: assignment.deliveryBoyName,
                otp: assignment.otp,
            } : undefined,
        });

    } catch (error) {
        console.error("Payment verification error:", error);
        return NextResponse.json(
            { message: "Payment verification failed" },
            { status: 500 }
        );
    }
}