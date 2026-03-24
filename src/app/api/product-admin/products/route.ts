import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { rbac } from "@/lib/rbac";
import Product from "@/models/product.model";
import uploadOnCloudinary from "@/lib/cloudinary";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// GET /api/product-admin/products
//   Full product catalogue with optional ?category=, ?q= (text search)
// ────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin", "productAdmin", "storeAdmin"]);
    if (!check.ok) return check.response;

    const category = req.nextUrl.searchParams.get("category");
    const q = req.nextUrl.searchParams.get("q");
    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (q) filter.$text = { $search: q };

    try {
        const products = await Product.find(filter).sort({ createdAt: -1 });
        return NextResponse.json(products, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/product-admin/products
//   Create a new global product (multipart/form-data).
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin", "productAdmin"]);
    if (!check.ok) return check.response;

    try {
        const formData = await req.formData();
        const name = formData.get("name") as string;
        const category = formData.get("category") as string;
        const price = formData.get("price") as string;
        const subcategory = formData.get("subcategory") as string | null;
        const description = formData.get("description") as string | null;
        const barcode = formData.get("barcode") as string | null;
        const brand = formData.get("brand") as string | null;
        const unit = formData.get("unit") as string | null;
        const discount = formData.get("discount") as string | null;
        const stock = formData.get("stock") as string | null;
        const tags = formData.get("tags") as string | null;   // comma-separated
        const file = formData.get("file") as Blob | null;

        if (!name || !category || !price) {
            return NextResponse.json(
                { message: "name, category, price are required" },
                { status: 400 }
            );
        }

        let imageUrl: string | undefined;
        if (file && (file as File).size > 0) {
            imageUrl = await uploadOnCloudinary(file);
        }

        const stockNum = stock ? Number(stock) : 0;
        const product = await Product.create({
            name,
            category,
            price: Number(price),
            subcategory: subcategory || undefined,
            description: description || undefined,
            barcode: barcode && barcode.trim() ? barcode.trim() : undefined,
            brand: brand || undefined,
            unit: unit || undefined,
            discount: discount ? Number(discount) : 0,
            stock: stockNum,
            inStock: stockNum > 0,   // explicit \u2014 never rely on schema default
            image: imageUrl,
            tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        });

        return NextResponse.json(product, { status: 201 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
