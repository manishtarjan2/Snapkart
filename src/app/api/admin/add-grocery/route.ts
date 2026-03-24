import { auth } from "@/auth";
import uploadOnCloudinary from "@/lib/cloudinary";
import connectDb from "@/lib/db";
import Product from "@/models/product.model";
import { NextRequest, NextResponse } from "next/server";

// ─── Allowed roles ───────────────────────────────────────────────────────────
const ALLOWED_ROLES = ["admin", "storeAdmin", "superAdmin", "productAdmin"] as const;

// ────────────────────────────────────────────────────────────────────────────
// POST /api/admin/add-grocery
//   Add a new product to the global catalogue.
//
// Accepts multipart/form-data:
//   name        (string, required)
//   category    (string, required)
//   price       (number, required)
//   stock       (number, default 0)
//   description (string, optional)
//   barcode     (string, optional — globally unique)
//   brand       (string, optional)
//   unit        (string, optional  e.g. "500g", "1L")
//   discount    (number 0-100, optional)
//   file        (image, optional)
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();

    // ── Auth & RBAC ──────────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user?.role || !ALLOWED_ROLES.includes(session.user.role as typeof ALLOWED_ROLES[number])) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        const fd = await req.formData();

        // ── Required fields ──────────────────────────────────────────────────
        const name     = (fd.get("name")     as string | null)?.trim();
        const category = (fd.get("category") as string | null)?.trim();
        const priceRaw = (fd.get("price")    as string | null)?.trim();

        if (!name || !category || !priceRaw) {
            return NextResponse.json(
                { message: "name, category and price are required" },
                { status: 400 }
            );
        }

        const price = Number(priceRaw);
        if (isNaN(price) || price < 0) {
            return NextResponse.json({ message: "price must be a non-negative number" }, { status: 400 });
        }

        // ── Optional fields ──────────────────────────────────────────────────
        const description = (fd.get("description") as string | null)?.trim() || undefined;
        const barcodeRaw  = (fd.get("barcode")     as string | null)?.trim();
        const brand       = (fd.get("brand")        as string | null)?.trim() || undefined;
        const unit        = (fd.get("unit")         as string | null)?.trim() || undefined;
        const stockRaw    = fd.get("stock")    as string | null;
        const discountRaw = fd.get("discount") as string | null;
        const file        = fd.get("file")     as Blob | null;

        const stock    = stockRaw    ? Math.max(0, Number(stockRaw))    : 0;
        const discount = discountRaw ? Math.min(100, Math.max(0, Number(discountRaw))) : 0;
        const barcode  = barcodeRaw || undefined;

        // ── Image upload ─────────────────────────────────────────────────────
        let imageUrl: string | undefined;
        if (file && (file as File).size > 0) {
            imageUrl = await uploadOnCloudinary(file);
        }

        // ── Create product ───────────────────────────────────────────────────
        const product = await Product.create({
            name,
            price,
            category,
            description,
            barcode,
            brand,
            unit,
            discount,
            stock,
            inStock: stock > 0,   // always derived from stock — never stale
            image: imageUrl,
        });

        return NextResponse.json(JSON.parse(JSON.stringify(product)), { status: 201 });

    } catch (err: unknown) {
        console.error("[POST /api/admin/add-grocery]", err);
        // Duplicate barcode error
        if ((err as { code?: number }).code === 11000) {
            return NextResponse.json({ message: "A product with this barcode already exists" }, { status: 409 });
        }
        return NextResponse.json({ message: "Failed to add product" }, { status: 500 });
    }
}
