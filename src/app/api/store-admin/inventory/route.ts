import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { rbac, resolveStoreAccess } from "@/lib/rbac";
import StoreInventory from "@/models/store-inventory.model";
import Product from "@/models/product.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// Helper: after any stock change, re-aggregate all stores and push the total
// back to Product.stock + Product.inStock so the user dashboard stays live.
// ────────────────────────────────────────────────────────────────────────────
async function syncProductStock(productId: string | mongoose.Types.ObjectId): Promise<void> {
    const oid = new mongoose.Types.ObjectId(String(productId));
    const [agg] = await StoreInventory.aggregate([
        { $match: { product_id: oid } },
        { $group: { _id: "$product_id", totalStock: { $sum: "$stock" } } },
    ]);
    const totalStock: number = agg?.totalStock ?? 0;
    await Product.findByIdAndUpdate(oid, {
        $set: { stock: totalStock, inStock: totalStock > 0 },
    });
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/store-admin/inventory?store_id=<id>
//   Returns all products in this store's inventory with stock levels.
//   storeAdmin → own store only.  superAdmin → any store via ?store_id=
// ────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin", "storeAdmin"]);
    if (!check.ok) return check.response;

    const { storeId, response } = resolveStoreAccess(
        check.session,
        req.nextUrl.searchParams.get("store_id")
    );
    if (response) return response;

    if (!storeId && check.session.user.role !== "superAdmin") {
        return NextResponse.json({ message: "store_id is required" }, { status: 400 });
    }

    try {
        const query = storeId ? { store_id: storeId } : {};
        const inventory = await StoreInventory.find(query)
            .populate("product_id", "name barcode category price image unit brand discount")
            .sort({ createdAt: -1 })
            .lean();

        // Attach low-stock flag
        const result = inventory.map((inv) => ({
            ...inv,
            isLowStock: (inv.stock ?? 0) <= (inv.lowStockThreshold ?? 5),
        }));

        return NextResponse.json(result, { status: 200 });
    } catch (err) {
        console.error("[GET /api/store-admin/inventory]", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/store-admin/inventory
//   Add / upsert a product into this store's inventory.
//   Body: { store_id?, product_id, stock, lowStockThreshold?,
//           store_location?, priceOverride? }
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin", "storeAdmin"]);
    if (!check.ok) return check.response;

    const body = await req.json();
    const { storeId, response } = resolveStoreAccess(check.session, body.store_id);
    if (response) return response;
    if (!storeId) return NextResponse.json({ message: "store_id required" }, { status: 400 });

    const { product_id, stock, lowStockThreshold, store_location, priceOverride } = body;
    if (!product_id) return NextResponse.json({ message: "product_id required" }, { status: 400 });

    // Verify product exists
    const product = await Product.findById(product_id).select("_id").lean();
    if (!product) return NextResponse.json({ message: "Product not found" }, { status: 404 });

    try {
        const inv = await StoreInventory.findOneAndUpdate(
            { store_id: storeId, product_id },
            {
                $set: {
                    stock:             typeof stock === "number" ? Math.max(0, stock) : 0,
                    lowStockThreshold: typeof lowStockThreshold === "number" ? lowStockThreshold : 5,
                    ...(store_location !== undefined && { store_location }),
                    priceOverride:     priceOverride ?? null,
                },
            },
            { upsert: true, new: true }
        );

        // Sync aggregated stock total back to Product
        await syncProductStock(inv.product_id);

        return NextResponse.json(inv, { status: 201 });
    } catch (err) {
        console.error("[POST /api/store-admin/inventory]", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/store-admin/inventory
//   Update stock for a (store, product) pair.
//   Body: { inventoryId, stock, stockDelta?, priceOverride?, store_location?, lowStockThreshold? }
//     inventoryId — document _id (preferred, used by StoreAdminDashboard)
//     stock       — absolute new value
//     stockDelta  — relative change (+10, -3); applied on top of current stock
// ────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
    await connectDb();
    const session = await auth();
    const check = rbac(session, ["superAdmin", "storeAdmin"]);
    if (!check.ok) return check.response;

    const body = await req.json();
    const { inventoryId, stockDelta, stock, priceOverride, store_location, lowStockThreshold, product_id } = body;

    // ── Build update object ──────────────────────────────────────────────────
    const update: Record<string, unknown> = {};

    if (typeof stockDelta === "number") {
        update.$inc = { stock: stockDelta };
    }

    const $set: Record<string, unknown> = {};
    if (typeof stock         === "number")    $set.stock             = Math.max(0, stock);
    if (priceOverride        !== undefined)   $set.priceOverride     = priceOverride;
    if (store_location       !== undefined)   $set.store_location    = store_location;
    if (lowStockThreshold    !== undefined)   $set.lowStockThreshold = lowStockThreshold;
    if (Object.keys($set).length > 0) update.$set = $set;

    if (Object.keys(update).length === 0) {
        return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    try {
        let inv;

        if (inventoryId) {
            // ── Preferred path: direct document ID (StoreAdminDashboard) ────
            inv = await StoreInventory.findByIdAndUpdate(inventoryId, update, { new: true });
        } else {
            // ── Fallback: store_id + product_id pair ─────────────────────────
            const { storeId, response } = resolveStoreAccess(check.session, body.store_id);
            if (response) return response;
            if (!product_id) return NextResponse.json({ message: "product_id or inventoryId required" }, { status: 400 });

            inv = await StoreInventory.findOneAndUpdate(
                { store_id: storeId, product_id },
                update,
                { new: true }
            );
        }

        if (!inv) {
            return NextResponse.json({ message: "Inventory record not found" }, { status: 404 });
        }

        // Sync aggregated stock total back to Product
        const resolvedProductId = product_id ?? inv.product_id;
        await syncProductStock(resolvedProductId);

        return NextResponse.json(inv, { status: 200 });
    } catch (err) {
        console.error("[PATCH /api/store-admin/inventory]", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
