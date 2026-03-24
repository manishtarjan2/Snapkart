import mongoose from "mongoose";

/**
 * StoreInventory — stock levels **per store per product**.
 *
 * This is the source of truth for "how many of product X does store Y have?"
 * A missing document means zero stock for that (store, product) pair.
 */
export interface IStoreInventory {
    _id?: mongoose.Types.ObjectId;
    store_id: mongoose.Types.ObjectId | string;
    product_id: mongoose.Types.ObjectId | string;
    /** Physical units on the shelf */
    stock: number;
    /** Low-stock alert threshold — storeAdmin gets notified below this */
    lowStockThreshold: number;
    /** Store-local shelf location, e.g. "Aisle 3-B" */
    store_location?: string;
    /** Override the global product price for this store (null = use product.price) */
    priceOverride?: number | null;
}

const storeInventorySchema = new mongoose.Schema<IStoreInventory>(
    {
        store_id: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
        product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Grocery", required: true },
        stock: { type: Number, required: true, default: 0, min: 0 },
        lowStockThreshold: { type: Number, default: 5 },
        store_location: { type: String },
        priceOverride: { type: Number, default: null },
    },
    { timestamps: true }
);

/** Each (store, product) pair must be unique */
storeInventorySchema.index({ store_id: 1, product_id: 1 }, { unique: true });
/** Fast look-up by store */
storeInventorySchema.index({ store_id: 1 });
/** Fast look-up by product (cross-store stock view) */
storeInventorySchema.index({ product_id: 1 });

const StoreInventory =
    mongoose.models.StoreInventory ||
    mongoose.model<IStoreInventory>("StoreInventory", storeInventorySchema);

export default StoreInventory;
