import { auth } from "@/auth";
import uploadOnCloudinary from "@/lib/cloudinary";
import connectDb from "@/lib/db";
import Product from "@/models/product.model";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ROLES = [
    "admin",
    "storeAdmin",
    "superAdmin",
    "productAdmin",
] as const;

export async function POST(req: NextRequest) {
    try {
        // Connect DB
        await connectDb();

        // Authentication
        const session = await auth();

        if (
            !session?.user?.role ||
            !ALLOWED_ROLES.includes(
                session.user.role as (typeof ALLOWED_ROLES)[number]
            )
        ) {
            return NextResponse.json(
                { message: "Forbidden" },
                { status: 403 }
            );
        }

        // Read FormData
        const formData = await req.formData();

        const name = formData.get("name")?.toString().trim();
        const category = formData.get("category")?.toString().trim();
        const priceString = formData.get("price")?.toString().trim();

        if (!name || !category || !priceString) {
            return NextResponse.json(
                {
                    message: "name, category and price are required",
                },
                { status: 400 }
            );
        }

        const price = Number(priceString);

        if (isNaN(price) || price < 0) {
            return NextResponse.json(
                {
                    message: "Invalid price",
                },
                { status: 400 }
            );
        }

        const description =
            formData.get("description")?.toString().trim() || "";

        const barcode =
            formData.get("barcode")?.toString().trim() || undefined;

        const brand =
            formData.get("brand")?.toString().trim() || "";

        const unit =
            formData.get("unit")?.toString().trim() || "";

        const stock = Number(formData.get("stock") || 0);

        const discount = Number(formData.get("discount") || 0);

        const imageFile = formData.get("file") as File | null;

        let image = "";

        // Upload Image
        if (imageFile && imageFile.size > 0) {
            try {
                image = await uploadOnCloudinary(imageFile);
            } catch (error) {
                console.error("Cloudinary Error:", error);
                // Fallback to empty image instead of blocking product creation
                console.warn("Continuing product creation without image due to Cloudinary error.");
                image = ""; 
            }
        }

        const product = await Product.create({
            name,
            category,
            price,
            description,
            barcode,
            brand,
            unit,
            stock,
            discount,
            image,
            inStock: stock > 0,
        });

        return NextResponse.json(product, {
            status: 201,
        });
    } catch (error: any) {
        console.error("Add Grocery Error:", error);

        if (error?.code === 11000) {
            return NextResponse.json(
                {
                    message: "Barcode already exists",
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            {
                message: error?.message || "Internal Server Error",
            },
            { status: 500 }
        );
    }
}