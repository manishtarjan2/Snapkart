import mongoose, { Schema } from "mongoose";

/**
 * Delivery — separate tracking document per delivery trip.
 * Decoupled from Order so the Order model stays lean.
 */
export interface IDelivery {
    _id?: mongoose.Types.ObjectId;
    order_id: mongoose.Types.ObjectId | string;
    delivery_boy_id: mongoose.Types.ObjectId | string;
    /** Store this delivery was dispatched from */
    store_id?: mongoose.Types.ObjectId | string;
    status: "assigned" | "pickedUp" | "inTransit" | "delivered" | "failed" | "cancelled";
    /** 6-digit OTP for doorstep confirmation */
    otp: string;
    otpVerified: boolean;
    /** Real-time GeoJSON position of the delivery boy */
    live_location?: {
        type: "Point";
        coordinates: [number, number];
    };
    /** Route history — array of [lng, lat] snapshots */
    locationHistory?: Array<{
        coordinates: [number, number];
        recordedAt: Date;
    }>;
    /** Timestamps for each status transition */
    assignedAt: Date;
    pickedUpAt?: Date;
    deliveredAt?: Date;
    estimatedDeliveryMinutes?: number;
    /** Fraud flag — deliveryAdmin can mark a suspicious delivery */
    flagged: boolean;
    flagReason?: string;
}

const deliverySchema = new mongoose.Schema<IDelivery>(
    {
        order_id: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
        delivery_boy_id: { type: Schema.Types.ObjectId, ref: "DeliveryBoy", required: true },
        store_id: { type: Schema.Types.ObjectId, ref: "Store" },
        status: {
            type: String,
            enum: ["assigned", "pickedUp", "inTransit", "delivered", "failed", "cancelled"],
            default: "assigned",
        },
        otp: { type: String, required: true },
        otpVerified: { type: Boolean, default: false },
        live_location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: { type: [Number], default: [0, 0] },
        },
        locationHistory: [
            {
                coordinates: { type: [Number], required: true },
                recordedAt: { type: Date, default: () => new Date() },
            },
        ],
        assignedAt: { type: Date, default: () => new Date() },
        pickedUpAt: { type: Date },
        deliveredAt: { type: Date },
        estimatedDeliveryMinutes: { type: Number },
        flagged: { type: Boolean, default: false },
        flagReason: { type: String },
    },
    { timestamps: true }
);

deliverySchema.index({ live_location: "2dsphere" });
deliverySchema.index({ delivery_boy_id: 1, status: 1 });

const Delivery =
    mongoose.models.Delivery || mongoose.model<IDelivery>("Delivery", deliverySchema);

export default Delivery;
