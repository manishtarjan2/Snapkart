import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { auth } from "@/auth";
import UserModel from "@/models/user.model";
import DeliveryBoy from "@/models/deliveryboy.model";

// ────────────────────────────────────────────────────────────────────────────
// POST /api/user/edit-role-mobile
//   Called once after first login (Google or Credentials) when
//   the user's profile is incomplete (no mobile / no role chosen).
//
//   Body: { role, mobile }
//
//   When role === "deliveryBoy":
//     → Also creates a DeliveryBoy profile so the rider dashboard works
//       immediately after onboarding.
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        await connectDb();

        const { role, mobile } = await req.json();

        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        // Validate role
        const allowedRoles = ["user", "deliveryBoy", "admin"];
        if (!allowedRoles.includes(role)) {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        if (!mobile || mobile.trim().length < 10) {
            return NextResponse.json({ error: "Valid mobile number required" }, { status: 400 });
        }

        const user = await UserModel.findOneAndUpdate(
            { email: session.user.email },
            { role, mobile: mobile.trim() },
            { new: true }
        );

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // ── Auto-create DeliveryBoy profile when role is deliveryBoy ───────
        if (role === "deliveryBoy") {
            const existingProfile = await DeliveryBoy.findOne({ userId: user._id });
            if (!existingProfile) {
                await DeliveryBoy.create({
                    userId: user._id,
                    name: user.name,
                    phone: mobile.trim(),
                    vehicleType: "bike",
                    status: "available",
                    isActive: true,
                    totalDeliveries: 0,
                });
                console.log(`✅ DeliveryBoy profile created for ${user.name} (${user.email})`);
            }
        }

        return NextResponse.json({ user });

    } catch (error) {
        console.error("Update failed:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}
