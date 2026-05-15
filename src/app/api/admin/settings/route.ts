import { auth } from "@/auth";
import { NextResponse } from "next/server";
import User from "@/models/user.model";
import Order from "@/models/order.model";
import connectDb from "@/lib/db";

export async function GET() {
    try {
        await connectDb();
        const session = await auth();

        if (!session?.user || (session.user.role !== "admin" && session.user.role !== "super-admin")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Get admin stats
        const totalUsers = await User.countDocuments();
        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Order.aggregate([
            { $match: { orderStatus: { $in: ["delivered", "confirmed", "outForDelivery"] } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);
        const activeDeliveries = await Order.countDocuments({
            orderStatus: { $in: ["confirmed", "outForDelivery"] }
        });
        const pendingOrders = await Order.countDocuments({
            orderStatus: "placed"
        });

        const stats = {
            totalUsers,
            totalOrders,
            totalRevenue: totalRevenue[0]?.total || 0,
            activeDeliveries,
            pendingOrders,
            systemHealth: "good" // In a real app, this would be calculated based on system metrics
        };

        // Default admin preferences (in a real app, this would come from admin preferences in DB)
        const adminPrefs = {
            maintenanceMode: false,
            autoAssignDeliveries: true,
            emailNotifications: true,
            smsGateway: "twilio",
            paymentGateway: "razorpay",
            backupFrequency: "daily",
            logRetention: 90,
            maxOrderRadius: 25,
            commissionRate: 5,
            minOrderValue: 50,
            supportEmail: "",
            systemAlerts: true,
            userRegistration: true,
            deliveryTracking: true
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
            adminPrefs
        });

    } catch (error) {
        console.error("Admin settings error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        await connectDb();
        const session = await auth();

        if (!session?.user || (session.user.role !== "admin" && session.user.role !== "super-admin")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, mobile, adminPrefs } = body;

        const updateData: any = {};
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

        // In a real app, you'd save adminPrefs to a separate collection or admin preferences

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
            adminPrefs
        });

    } catch (error) {
        console.error("Admin settings update error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}