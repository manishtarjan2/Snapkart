import { auth } from "@/auth";
import { redirect } from "next/navigation";
import User from "@/models/user.model";
import connectDb from "@/lib/db";
import Nav from "@/components/Nav";
import React from "react";
import { Heart } from "lucide-react";
import WishlistClient from "./WishlistClient";

export default async function WishlistPage() {
    await connectDb();
    const session = await auth();
    if (!session?.user) redirect("/login");

    const user = await User.findById(session.user.id);
    if (!user) redirect("/login");

    const userData = { _id: user._id.toString(), name: user.name, email: user.email, mobile: user.mobile, role: user.role, image: user.image || null };

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <Nav user={userData} />
            <main className="pt-24 max-w-6xl mx-auto px-4 sm:px-6 pb-20">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center text-white shadow-lg">
                        <Heart className="w-6 h-6" />
                    </div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">Wishlist</h1>
                </div>
                
                <WishlistClient />
                
            </main>
        </div>
    );
}
