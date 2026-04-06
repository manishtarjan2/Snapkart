import connectDb from "@/lib/db";
import Product from "@/models/product.model";
import { NextResponse } from "next/server";

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        await connectDb();
        const { id } = params;
        const body = await req.json().catch(() => ({}));
        const action = body.action || "view"; // "view" | "sale"

        const updatePayload: any = {};
        if (action === "view") updatePayload.views = 1;
        if (action === "sale") updatePayload.sales = 1;

        if (Object.keys(updatePayload).length > 0) {
            await Product.findByIdAndUpdate(id, {
                $inc: updatePayload
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Tracking Error:", error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
