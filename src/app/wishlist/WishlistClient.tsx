"use client";
import React from "react";
import { useWishlist } from "@/context/WishlistContext";
import GroceryItemCard from "@/components/GroceryItemCard";
import { Heart } from "lucide-react";
import Link from "next/link";

export default function WishlistClient() {
    const { items } = useWishlist();

    return (
        <div className="w-full">
            {items.length === 0 ? (
                <div className="bg-gray-900 border border-white/10 rounded-3xl p-12 shadow-2xl flex flex-col items-center justify-center text-center">
                    <Heart className="w-16 h-16 text-gray-500 mb-4 opacity-50" />
                    <h2 className="text-xl font-bold text-white mb-2">Your Wishlist is Empty</h2>
                    <p className="text-gray-400 max-w-sm mb-6">Start exploring items and click the heart icon to save them for later.</p>
                    <Link href="/" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all">
                        Explore Groceries
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {items.map((item) => (
                        <GroceryItemCard key={item._id} item={item as any} />
                    ))}
                </div>
            )}
        </div>
    );
}
