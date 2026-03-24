import mongoose from "mongoose";

// ─── Sub-document: one line-item in a bill/order ────────────────────────────

export interface IOrderItem {
    groceryId: mongoose.Types.ObjectId | string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
}

// ─── Main Order document ─────────────────────────────────────────────────────

export interface IOrder {
    _id?: mongoose.Types.ObjectId;
    /**
     * For online orders: the customer's user ID.
     * For offline (POS) orders: the admin/cashier who processed the sale.
     */
    userId: mongoose.Types.ObjectId | string;

    items: IOrderItem[];

    /**
     * Delivery address — required for online, absent for offline walk-in sales.
     */
    address?: {
        fullName: string;
        phone: string;
        street: string;
        city: string;
        state: string;
        pincode: string;
        /** Customer lat/lng for proximity delivery assignment */
        latitude?: number;
        longitude?: number;
    };

    totalAmount: number;
    paymentMethod: string;
    paymentStatus: "pending" | "paid" | "failed" | "refunded";
    orderStatus: "placed" | "confirmed" | "outForDelivery" | "delivered" | "cancelled" | "refunded";

    /** online = delivery, offline = POS sale, selfCheckout = scan-and-go */
    type: "online" | "offline" | "selfCheckout";

    /** The store / branch this order belongs to */
    store_id?: mongoose.Types.ObjectId | string;

    // ── Delivery fields ──────────────────────────────────────────────────────
    /** Assigned delivery boy */
    deliveryBoyId?: mongoose.Types.ObjectId | string;
    /** One-time password the customer shares on doorstep delivery confirmation */
    deliveryOtp?: string;
    otpVerified?: boolean;

    // ── Refund fields ────────────────────────────────────────────────────────
    refundStatus?: "none" | "requested" | "approved" | "rejected";
    refundReason?: string;

    createdAt?: Date;
    updatedAt?: Date;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const orderItemSchema = new mongoose.Schema<IOrderItem>({
    groceryId: { type: mongoose.Schema.Types.ObjectId, ref: "Grocery" },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    image: { type: String },
});

const orderSchema = new mongoose.Schema<IOrder>(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        items: [orderItemSchema],
        address: {
            fullName: { type: String },
            phone: { type: String },
            street: { type: String },
            city: { type: String },
            state: { type: String },
            pincode: { type: String },
            latitude: { type: Number },
            longitude: { type: Number },
        },
        totalAmount: { type: Number, required: true },
        paymentMethod: { type: String, default: "UPI" },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded"],
            default: "pending",
        },
        orderStatus: {
            type: String,
            enum: ["placed", "confirmed", "outForDelivery", "delivered", "cancelled", "refunded"],
            default: "placed",
        },
        type: {
            type: String,
            enum: ["online", "offline", "selfCheckout"],
            default: "online",
        },
        store_id: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },

        // Delivery
        deliveryBoyId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryBoy" },
        deliveryOtp: { type: String },
        otpVerified: { type: Boolean, default: false },

        // Refund
        refundStatus: { type: String, enum: ["none", "requested", "approved", "rejected"], default: "none" },
        refundReason: { type: String },
    },
    { timestamps: true }
);

const Order = mongoose.models.Order || mongoose.model<IOrder>("Order", orderSchema);
export default Order;
