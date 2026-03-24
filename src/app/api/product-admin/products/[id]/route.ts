import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { rbac } from "@/lib/rbac";
import Product from "@/models/product.model";
import uploadOnCloudinary from "@/lib/cloudinary";
import { NextRequest, NextResponse } from "next/server";

const STRING_FIELDS = ["name", "category", "subcategory", "description", "brand", "unit", "image"] as const;
const NUMBER_FIELDS = ["price", "discount", "stock"] as const;
const BOOLEAN_FIELDS = ["isActive"] as const;

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/product-admin/products/[id]
//   Accepts EITHER:
//     • application/json     — stock-only update (quick stock modal)
//     • multipart/form-data  — full edit including optional new image
//
//  inStock is ALWAYS derived server-side from stock to keep them in sync.
// ────────────────────────────────────────────────────────────────────────────
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin", "productAdmin"]);
    if (!check.ok) return check.response;

    const { id } = await params;

    try {
        const contentType = req.headers.get("content-type") ?? "";
        const update: Record<string, unknown> = {};

        if (contentType.includes("multipart/form-data")) {
            // ── Full edit form (FormData path) ───────────────────────────────
            const fd = await req.formData();

            // String fields — skip only truly empty values (not "0")
            for (const f of STRING_FIELDS) {
                const v = fd.get(f) as string | null;
                if (v !== null && v !== "") update[f] = v;
            }

            // Number fields — "0" is a VALID value, must not be skipped
            for (const f of NUMBER_FIELDS) {
                const v = fd.get(f) as string | null;
                if (v !== null) {
                    const n = Number(v);
                    if (!isNaN(n)) update[f] = n;
                }
            }

            // Boolean fields
            for (const f of BOOLEAN_FIELDS) {
                const v = fd.get(f) as string | null;
                if (v !== null) update[f] = v === "true";
            }

            // Tags (comma-separated string)
            const tags = fd.get("tags") as string | null;
            if (tags !== null) {
                update.tags = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
            }

            // Barcode — sparse unique index: only set if non-empty
            const barcode = fd.get("barcode") as string | null;
            if (barcode && barcode.trim()) update.barcode = barcode.trim();

            // Image upload (optional)
            const file = fd.get("file") as Blob | null;
            if (file && (file as File).size > 0) {
                const url = await uploadOnCloudinary(file);
                if (url) update.image = url;
            }

        } else {
            // ── Quick stock update (JSON path) ───────────────────────────────
            const body = await req.json() as Record<string, unknown>;

            for (const f of STRING_FIELDS) {
                if (body[f] !== undefined && body[f] !== "") update[f] = body[f];
            }
            for (const f of NUMBER_FIELDS) {
                if (body[f] !== undefined) {
                    const n = Number(body[f]);
                    if (!isNaN(n)) update[f] = n;
                }
            }
            for (const f of BOOLEAN_FIELDS) {
                if (body[f] !== undefined) update[f] = Boolean(body[f]);
            }
            if (body.barcode !== undefined && String(body.barcode).trim()) {
                update.barcode = String(body.barcode).trim();
            }
            if (body.tags !== undefined) update.tags = body.tags;
        }

        if (Object.keys(update).length === 0) {
            return NextResponse.json({ message: "No fields to update" }, { status: 400 });
        }

        // ★ Always enforce: inStock is derived from stock
        //   This single rule ensures they are NEVER out of sync in MongoDB
        if (update.stock !== undefined) {
            update.inStock = (update.stock as number) > 0;
        }

        const product = await Product.findByIdAndUpdate(id, { $set: update }, { new: true });
        if (!product) return NextResponse.json({ message: "Product not found" }, { status: 404 });

        return NextResponse.json(product.toObject(), { status: 200 });

    } catch (err) {
        console.error("[PATCH /api/product-admin/products/:id]", err);
        return NextResponse.json({ message: "Server error", detail: String(err) }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/product-admin/products/[id]  — soft-delete (set isActive: false)
// ────────────────────────────────────────────────────────────────────────────
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin", "productAdmin"]);
    if (!check.ok) return check.response;

    const { id } = await params;
    try {
        const product = await Product.findByIdAndUpdate(
            id,
            { $set: { isActive: false } },
            { new: true }
        );
        if (!product) return NextResponse.json({ message: "Product not found" }, { status: 404 });
        return NextResponse.json({ message: "Product deactivated", product }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
