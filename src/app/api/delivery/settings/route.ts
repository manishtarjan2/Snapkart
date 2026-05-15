import { auth } from "@/auth";
import { NextResponse } from "next/server";
import User from "@/models/user.model";
import Order from "@/models/order.model";
import DeliveryBoy from "@/models/deliveryboy.model";
import connectDb from "@/lib/db";

export async function GET() {
    try {
        await connectDb();
        const session = await auth();

        if (!session?.user || !["deliveryBoy", "diliveryBoy"].includes(session.user.role)) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Find the DeliveryBoy profile linked to this user
        const profile = await DeliveryBoy.findOne({ userId: session.user.id });

        // Get delivery stats using DeliveryBoy._id (which is what Order.deliveryBoyId references)
        const deliveryBoyId = profile?._id;

        let totalDeliveries = 0;
        let completedDeliveries = 0;

        if (deliveryBoyId) {
            totalDeliveries = await Order.countDocuments({
                deliveryBoyId,
                orderStatus: { $in: ["delivered", "outForDelivery", "confirmed"] }
            });

            completedDeliveries = await Order.countDocuments({
                deliveryBoyId,
                orderStatus: "delivered"
            });
        }

        const stats = {
            totalDeliveries,
            totalEarnings: 0,
            completedDeliveries,
            pendingDeliveries: totalDeliveries - completedDeliveries,
            cancelledDeliveries: 0,
            averageRating: 0,
            lastDeliveryDate: null as string | null,
        };

        // Default delivery preferences
        const deliveryPrefs = {
            vehicleType: profile?.vehicleType || "bike",
            licenseNumber: "",
            vehicleNumber: profile?.vehicleNumber || "",
            isAvailable: profile?.status === "available",
            deliveryRadius: 10,
            preferredAreas: [],
            workingHours: { start: "09:00", end: "21:00" },
            instantDelivery: true,
            maxOrdersPerDay: 20,
            emergencyContact: "",
            bankAccount: { accountNumber: "", ifsc: "", holderName: "" }
        };

        return NextResponse.json({
            user: {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                image: user.image || null,
                isBlocked: user.isBlocked,
                createdAt: user.createdAt?.toISOString(),
                updatedAt: user.updatedAt?.toISOString()
            },
            stats,
            deliveryPrefs,
            profile: profile ? {
                status: profile.status,
                vehicleType: profile.vehicleType,
                vehicleNumber: profile.vehicleNumber,
                totalDeliveries: profile.totalDeliveries,
                isActive: profile.isActive,
            } : null,
        });

    } catch (error) {
        console.error("Delivery settings error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        await connectDb();
        const session = await auth();

        if (!session?.user || !["deliveryBoy", "diliveryBoy"].includes(session.user.role)) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, mobile, deliveryPrefs } = body;

        const updateData: Record<string, unknown> = {};
        if (name) updateData.name = name;
        if (mobile) updateData.mobile = mobile;

        const user = await User.findByIdAndUpdate(
            session.user.id,
            updateData,
            { new: true }
        );

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Update DeliveryBoy profile if prefs provided
        if (deliveryPrefs) {
            const profileUpdate: Record<string, unknown> = {};
            if (deliveryPrefs.vehicleType) profileUpdate.vehicleType = deliveryPrefs.vehicleType;
            if (deliveryPrefs.vehicleNumber) profileUpdate.vehicleNumber = deliveryPrefs.vehicleNumber;
            if (name) profileUpdate.name = name;
            if (mobile) profileUpdate.phone = mobile;

            if (Object.keys(profileUpdate).length > 0) {
                await DeliveryBoy.findOneAndUpdate(
                    { userId: session.user.id },
                    { $set: profileUpdate },
                    { new: true }
                );
            }
        }

        return NextResponse.json({
            message: "Settings updated successfully",
            user: {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                image: user.image || null,
                isBlocked: user.isBlocked,
                createdAt: user.createdAt?.toISOString(),
                updatedAt: user.updatedAt?.toISOString()
            },
            deliveryPrefs
        });

    } catch (error) {
        console.error("Delivery settings update error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}