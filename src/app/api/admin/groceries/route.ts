import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Product from "@/models/product.model";
import { NextRequest, NextResponse } from "next/server";

// ─── Allowed roles ───────────────────────────────────────────────────────────
const ALLOWED = ["admin", "storeAdmin", "superAdmin", "productAdmin"] as const;

function isAllowed(role?: string | null): boolean {
    return !!role && ALLOWED.includes(role as typeof ALLOWED[number]);
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/groceries
//   Returns the full product catalogue (all active + inactive).
//   Supports ?category=<cat> and ?q=<search> query params.
// ────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!isAllowed(session?.user?.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        const category = req.nextUrl.searchParams.get("category");
        const q        = req.nextUrl.searchParams.get("q");

        const filter: Record<string, unknown> = {};
        if (category) filter.category = category;
        if (q)        filter.$text    = { $search: q };

        const groceries = await Product.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(groceries, { status: 200 });
    } catch (err) {
        console.error("[GET /api/admin/groceries]", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/groceries
//   Quick stock update for a product.
//   Body: { id: string, stock: number }
//   Also auto-syncs inStock from the new stock value.
// ────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!isAllowed(session?.user?.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        const { id, stock } = await req.json();

        if (!id) {
            return NextResponse.json({ message: "id is required" }, { status: 400 });
        }
        if (typeof stock !== "number" || isNaN(stock)) {
            return NextResponse.json({ message: "stock must be a number" }, { status: 400 });
        }

        const newStock = Math.max(0, stock);
        const updated = await Product.findByIdAndUpdate(
            id,
            { $set: { stock: newStock, inStock: newStock > 0 } },
            { new: true }
        ).lean();

        if (!updated) {
            return NextResponse.json({ message: "Product not found" }, { status: 404 });
        }

        return NextResponse.json(updated, { status: 200 });
    } catch (err) {
        console.error("[PATCH /api/admin/groceries]", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/groceries
//   Hard-delete a product from the catalogue.
//   Body: { id: string }
// ────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!isAllowed(session?.user?.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ message: "id is required" }, { status: 400 });
        }

        const deleted = await Product.findByIdAndDelete(id).lean();
        if (!deleted) {
            return NextResponse.json({ message: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Product deleted successfully" }, { status: 200 });
    } catch (err) {
        console.error("[DELETE /api/admin/groceries]", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
