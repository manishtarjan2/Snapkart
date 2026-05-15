import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";

// ────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-order
//   Creates a Razorpay order using the REST API directly (no npm SDK needed).
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        await connectDb();
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { amount, currency = "INR", receipt } = await req.json();

        if (!amount || amount <= 0) {
            return NextResponse.json({ message: "Invalid amount" }, { status: 400 });
        }

        const keyId = process.env.RAZORPAY_KEY_ID!;
        const keySecret = process.env.RAZORPAY_KEY_SECRET!;

        // Create Razorpay order via REST API
        const response = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization:
                    "Basic " +
                    Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
            },
            body: JSON.stringify({
                amount: Math.round(amount * 100), // Amount in paisa
                currency,
                receipt: receipt || `rcpt_${Date.now()}`,
                payment_capture: 1, // Auto capture
            }),
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error("Razorpay API error:", response.status, errBody);
            throw new Error("Razorpay order creation failed");
        }

        const order = await response.json();

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: keyId,
        });

    } catch (error) {
        console.error("Razorpay order creation error:", error);
        return NextResponse.json(
            { message: "Failed to create payment order" },
            { status: 500 }
        );
    }
}