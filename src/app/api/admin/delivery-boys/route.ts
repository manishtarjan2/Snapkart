import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import DeliveryBoy from "@/models/deliveryboy.model";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/delivery-boys  — list all delivery boy profiles
// ────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !["admin", "storeAdmin", "superAdmin", "deliveryAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        const status = req.nextUrl.searchParams.get("status");
        const filter: Record<string, unknown> = {};
        if (status) filter.status = status;

        const boys = await DeliveryBoy.find(filter)
            .populate("userId", "name email mobile image")
            .populate("store_id", "name address.city")
            .sort({ createdAt: -1 });

        return NextResponse.json(boys, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/admin/delivery-boys
//   Creates/updates a User record with role=deliveryBoy and a DeliveryBoy profile.
//
//   Body: { name, email, password?, phone, vehicleType, vehicleNumber?,
//           store_id? }
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    await connectDb();
    const session = await auth();
    if (!session?.user?.role || !["admin", "storeAdmin", "superAdmin", "deliveryAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        const { name, email, password, phone, vehicleType, vehicleNumber, store_id } =
            await req.json();

        if (!name || !email || !phone || !vehicleType) {
            return NextResponse.json(
                { message: "name, email, phone, vehicleType are required" },
                { status: 400 }
            );
        }

        // Upsert the User account
        let user = await User.findOne({ email });
        if (!user) {
            const bcrypt = await import("bcryptjs");
            const hashedPw = password
                ? await bcrypt.default.hash(password, 10)
                : await bcrypt.default.hash(Math.random().toString(36).slice(-8), 10);

            user = await User.create({
                name,
                email,
                password: hashedPw,
                mobile: phone,
                role: "deliveryBoy",
            });
        } else {
            await User.findByIdAndUpdate(user._id, { role: "deliveryBoy", mobile: phone });
        }

        // Upsert the DeliveryBoy profile
        const profile = await DeliveryBoy.findOneAndUpdate(
            { userId: user._id },
            {
                $set: {
                    name,
                    phone,
                    vehicleType,
                    vehicleNumber: vehicleNumber || undefined,
                    store_id: store_id || undefined,
                    isActive: true,
                    status: "available",
                },
            },
            { upsert: true, new: true }
        );

        return NextResponse.json(
            { message: "Delivery boy added", user, profile },
            { status: 201 }
        );
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
