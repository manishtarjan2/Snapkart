import connectDb from "@/lib/db";
import Product from "@/models/product.model";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/user/scan?code=<barcode>
 *
 * Looks up a product by its barcode (or MongoDB _id for testing).
 * Returns item details including current stock & store_location.
 * Public endpoint — product catalogue data is not sensitive.
 */
export async function GET(req: NextRequest) {
    try {
        await connectDb();
        const code = req.nextUrl.searchParams.get("code")?.trim();

        if (!code) {
            return NextResponse.json({ message: "No barcode provided" }, { status: 400 });
        }

        const item = await Product.findOne({
            $or: [
                { barcode: code },
                ...(code.length === 24 ? [{ _id: code }] : []),
            ],
        });

        if (!item) {
            return NextResponse.json({ message: "Product not found" }, { status: 404 });
        }

        if (item.stock <= 0) {
            return NextResponse.json(
                {
                    message: "Product out of stock",
                    name: item.name,
                    stock: 0,
                },
                { status: 409 }
            );
        }

        return NextResponse.json(JSON.parse(JSON.stringify(item)), { status: 200 });
    } catch (err) {
        console.error("Scan lookup error:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
