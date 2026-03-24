import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { auth } from "@/auth";              // session function from your auth.ts
import UserModel from "@/models/user.model"; // your Mongo user model

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    const { role, mobile } = await req.json(); // removed unused userId

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await UserModel.findOneAndUpdate(
      { email: session.user.email },
      { role, mobile },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });

  } catch (error) {
    console.error("Update failed:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
