import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Product from "@/models/product.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/products/[id]
//   Admin can update any product field, including stock & store_location.
//
// Body (all fields optional):
//   { name, price, category, description, inStock, barcode,
//     stock, store_location, image }
// ────────────────────────────────────────────────────────────────────────────
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectDb();

    const session = await auth();
    if (!session?.user?.role || !["admin", "superAdmin", "productAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    // Build only the fields that were sent — never allow arbitrary keys
    const allowed = [
        "name", "price", "category", "subcategory", "description",
        "barcode", "stock", "store_location", "image",
        "discount", "brand", "unit", "isActive", "tags",
    ] as const;

    const updateFields: Record<string, unknown> = {};
    for (const key of allowed) {
        if (body[key] !== undefined) {
            updateFields[key] = body[key];
        }
    }

    // Keep inStock in sync if stock is being updated
    if (typeof body.stock === "number") {
        updateFields.inStock = body.stock > 0;
    }

    if (Object.keys(updateFields).length === 0) {
        return NextResponse.json({ message: "No valid fields to update" }, { status: 400 });
    }

    try {
        const updated = await Product.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return NextResponse.json({ message: "Product not found" }, { status: 404 });
        }

        return NextResponse.json(JSON.parse(JSON.stringify(updated)), { status: 200 });
    } catch (err) {
        console.error("Product update error:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/products/[id]  — single product details
// ────────────────────────────────────────────────────────────────────────────
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectDb();

    const session = await auth();
    if (!session?.user?.role || !["admin", "superAdmin", "productAdmin", "storeAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    try {
        const product = await Product.findById(id);
        if (!product) {
            return NextResponse.json({ message: "Product not found" }, { status: 404 });
        }
        return NextResponse.json(JSON.parse(JSON.stringify(product)), { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
