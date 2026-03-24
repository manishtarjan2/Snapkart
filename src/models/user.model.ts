import mongoose from "mongoose";

/** All supported role values in the system */
export type UserRole =
    | "superAdmin"      // Top-level — controls everything
    | "storeAdmin"      // Manages ONE specific store branch
    | "productAdmin"    // Manages global product catalogue
    | "deliveryAdmin"   // Manages delivery logistics
    | "deliveryBoy"     // Field rider
    | "posAdmin"        // POS counter manager — assigns employees
    | "employee"        // Store-level employee assigned by posAdmin
    | "user";           // End customer

export interface IUser {
    _id?: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password?: string;
    mobile?: string;
    role: UserRole;
    image?: string;
    /**
     * For storeAdmin / deliveryBoy — which store they belong to.
     * null for superAdmin / productAdmin / user.
     */
    store_id?: mongoose.Types.ObjectId | string | null;
    /** Unique short ID for employees created by posAdmin (e.g. EMP001) */
    employeeId?: string;
    /** superAdmin can block any account */
    isBlocked: boolean;
}

const userSchema = new mongoose.Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, unique: true, required: true },
        password: { type: String },
        mobile: { type: String },
        role: {
            type: String,
            enum: [
                "superAdmin", "storeAdmin", "productAdmin",
                "deliveryAdmin", "deliveryBoy",
                "posAdmin", "employee",
                "user",
                // legacy values kept so existing documents don't break
                "admin", "diliveryBoy",
            ],
            default: "user",
        },
        store_id: { type: mongoose.Schema.Types.ObjectId, ref: "Store", default: null },
        employeeId: { type: String, sparse: true, default: null },
        image: { type: String },
        isBlocked: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
export default User;
