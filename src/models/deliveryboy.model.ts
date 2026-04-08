import mongoose, { Schema } from "mongoose";

export interface IDeliveryBoy {
    _id?: mongoose.Types.ObjectId;
    /** Links to User._id so they can log in with the same credentials */
    userId: mongoose.Types.ObjectId | string;
    name: string;
    phone: string;
    vehicleType: "bike" | "scooter" | "bicycle" | "car" | "van";
    vehicleNumber?: string;
    /** Operational status — updated in real-time */
    status: "available" | "busy" | "offline";
    /** GeoJSON point updated by the delivery-boy app [longitude, latitude] */
    currentLocation?: {
        type: "Point";
        coordinates: [number, number];
    };
    /** Store branch this delivery boy is attached to */
    store_id?: mongoose.Types.ObjectId | string;
    totalDeliveries: number;
    isActive: boolean;
}

const deliveryBoySchema = new mongoose.Schema<IDeliveryBoy>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        name: { type: String, required: true },
        phone: { type: String, required: true },
        vehicleType: { type: String, enum: ["bike", "scooter", "bicycle", "car", "van"], required: true },
        vehicleNumber: { type: String },
        status: { type: String, enum: ["available", "busy", "offline"], default: "available" },
        currentLocation: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: { type: [Number], default: [0, 0] },
        },
        store_id: { type: Schema.Types.ObjectId, ref: "Store" },
        totalDeliveries: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// 2dsphere index for $near geospatial queries
deliveryBoySchema.index({ currentLocation: "2dsphere" });

const DeliveryBoy =
    mongoose.models.DeliveryBoy || mongoose.model<IDeliveryBoy>("DeliveryBoy", deliveryBoySchema);
export default DeliveryBoy;
