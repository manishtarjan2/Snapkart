import mongoose from "mongoose";

/**
 * Product — the global catalogue entry.
 * Stock is NOT stored here — it lives in StoreInventory per branch.
 * This makes cross-store product management clean and consistent.
 */
export interface IProduct {
    _id?: mongoose.Types.ObjectId;
    name: string;
    price: number;           // base price (store can override via StoreInventory.priceOverride)
    category: string;
    subcategory?: string;
    image?: string;
    description?: string;
    barcode?: string;        // globally unique SKU / EAN
    brand?: string;
    unit?: string;           // e.g. "500g", "1L", "1 pc"
    /** Discount % set by productAdmin (0–100) */
    discount: number;
    /** Quantity available in catalogue (can be overridden per store via StoreInventory) */
    stock: number;
    /** Whether the product is currently in stock */
    inStock: boolean;
    isActive: boolean;       // productAdmin can deactivate
    tags?: string[];
}

const productSchema = new mongoose.Schema<IProduct>(
    {
        name: { type: String, required: true, index: true },
        price: { type: Number, required: true, min: 0 },
        category: { type: String, required: true, index: true },
        subcategory: { type: String },
        image: { type: String },
        description: { type: String },
        barcode: { type: String, unique: true, sparse: true, index: true },
        brand: { type: String },
        unit: { type: String },
        discount: { type: Number, default: 0, min: 0, max: 100 },
        stock: { type: Number, default: 0, min: 0 },
        inStock: { type: Boolean, default: false },   // false by default since stock starts at 0
        isActive: { type: Boolean, default: true },
        tags: [{ type: String }],
    },
    { timestamps: true }
);

/** Text index for full-text product search */
productSchema.index({ name: "text", description: "text", tags: "text" });

/**
 * Model name "Grocery" is kept so existing documents aren't orphaned.
 */
const Product =
    mongoose.models.Grocery || mongoose.model<IProduct>("Grocery", productSchema);

export default Product;
