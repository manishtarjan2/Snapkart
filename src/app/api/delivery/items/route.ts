import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Grocery from "@/models/product.model";
import { NextResponse } from "next/server";

// Delivery boy gets all in-stock items to deliver
export async function GET() {
    try {
        await connectDb();
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        const items = await Grocery.find({ inStock: true }).sort({ createdAt: -1 });
        return NextResponse.json(items, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
