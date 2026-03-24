import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { rbac } from "@/lib/rbac";
import Product from "@/models/product.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// GET /api/product-admin/categories  — distinct active categories + counts
// ────────────────────────────────────────────────────────────────────────────
export async function GET() {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin", "productAdmin", "storeAdmin"]);
    if (!check.ok) return check.response;

    try {
        const categories = await Product.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                    subcategories: { $addToSet: "$subcategory" },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        return NextResponse.json(categories, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/product-admin/categories
//   Rename a category or set discount across all products in a category.
//   Body: { action: "setDiscount", category, discount }
//       | { action: "rename", oldCategory, newCategory }
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin", "productAdmin"]);
    if (!check.ok) return check.response;

    const body = await req.json();

    try {
        if (body.action === "setDiscount" || body.action === "bulkDiscount") {
            const { category, discount } = body;
            const result = await Product.updateMany(
                { category },
                { $set: { discount: Number(discount) } }
            );
            return NextResponse.json(
                { message: "Discount applied", modifiedCount: result.modifiedCount },
                { status: 200 }
            );
        }

        if (body.action === "rename") {
            const result = await Product.updateMany(
                { category: body.oldCategory },
                { $set: { category: body.newCategory } }
            );
            return NextResponse.json(
                { message: "Category renamed", modifiedCount: result.modifiedCount },
                { status: 200 }
            );
        }

        return NextResponse.json({ message: "Unknown action" }, { status: 400 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
