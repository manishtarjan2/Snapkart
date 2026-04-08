import mongoose, { Schema } from "mongoose";

/**
 * Store (branch) — updated with manager_id (ref to User).
 * commission & deliveryZone fields are managed by superAdmin.
 */
export interface IStore {
    _id?: mongoose.Types.ObjectId;
    name: string;
    address: {
        street: string;
        city: string;
        state: string;
        pincode: string;
    };
    /** GeoJSON point for proximity queries [longitude, latitude] */
    location?: {
        type: "Point";
        coordinates: [number, number];
    };
    phone?: string;
    /** References the User with role=storeAdmin who manages this store */
    manager_id?: mongoose.Types.ObjectId | string | null;
    isActive: boolean;
    /** Commission % superAdmin charges on this store's sales (0–100) */
    commission: number;
    /** Delivery radius in km — orders beyond this are rejected */
    deliveryRadiusKm: number;
}

const storeSchema = new mongoose.Schema<IStore>(
    {
        name: { type: String, required: true },
        address: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
        },
        location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: { type: [Number], default: [0, 0] },
        },
        phone: { type: String },
        manager_id: { type: Schema.Types.ObjectId, ref: "User", default: null },
        isActive: { type: Boolean, default: true },
        commission: { type: Number, default: 0, min: 0, max: 100 },
        deliveryRadiusKm: { type: Number, default: 10 },
    },
    { timestamps: true }
);

storeSchema.index({ location: "2dsphere" });

const Store = mongoose.models.Store || mongoose.model<IStore>("Store", storeSchema);
export default Store;
