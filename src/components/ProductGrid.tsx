"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Loader2 } from "lucide-react";
import GroceryItemCard from "./GroceryItemCard";

type GroceryItem = {
    _id: string;
    name: string;
    price: number;
    category: string;
    image?: string;
    description?: string;
    isActive: boolean;
    inStock: boolean;
    stock: number;
    discount: number;
    brand?: string;
    unit?: string;
};

const CATEGORIES = [
    { label: "All", emoji: "🛒" },
    { label: "Fruits", emoji: "🍎" },
    { label: "Vegetables", emoji: "🥦" },
    { label: "Dairy", emoji: "🥛" },
    { label: "Snacks", emoji: "🍿" },
    { label: "Bakery", emoji: "🍞" },
    { label: "Beverages", emoji: "🧃" },
    { label: "Meat & Fish", emoji: "🥩" },
    { label: "Other", emoji: "📦" },
];

export default function ProductGrid({ initialItems }: { initialItems: GroceryItem[] }) {
    const [active, setActive] = useState("All");
    const [search, setSearch] = useState("");
    const [items, setItems] = useState<GroceryItem[]>(initialItems);

    // Filter: category + search; in-stock items first
    const filtered = items
        .filter((item) => {
            const matchCat = active === "All" || item.category.toLowerCase() === active.toLowerCase();
            const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
            return matchCat && matchSearch;
        })
        .sort((a, b) => {
            // In-stock items appear before out-of-stock ones
            const aInStock = a.inStock && a.stock > 0;
            const bInStock = b.inStock && b.stock > 0;
            if (aInStock === bInStock) return 0;
            return aInStock ? -1 : 1;
        });

    // Listen to HeroSection search events
    useEffect(() => {
        const handler = (e: CustomEvent) => setSearch(e.detail || "");
        window.addEventListener("snapkart:search", handler as EventListener);
        return () => window.removeEventListener("snapkart:search", handler as EventListener);
    }, []);

    return (
        <div>
            {/* ── Category Slider ── */}
            <div className="px-4 py-4 max-w-6xl mx-auto">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
                    Browse Categories
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hidden">
                    {CATEGORIES.map((cat, i) => (
                        <motion.button
                            key={cat.label}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => setActive(cat.label)}
                            className={`flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-full border text-sm font-semibold transition-all duration-200 cursor-pointer ${active === cat.label
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200"
                                : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                                }`}
                        >
                            <span>{cat.emoji}</span>
                            <span>{cat.label}</span>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* ── Section heading ── */}
            <div className="max-w-6xl mx-auto px-4 mt-2 mb-4 flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-gray-800">
                    {active === "All" ? "All Products" : active}
                    {search && (
                        <span className="text-gray-400 font-normal text-base ml-2">
                            for &ldquo;{search}&rdquo;
                        </span>
                    )}
                </h3>
                <span className="text-xs text-gray-400 font-medium">
                    {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* ── Product grid ── */}
            <div className="max-w-6xl mx-auto px-4">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 gap-3 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <span className="text-5xl">🛒</span>
                        <p className="font-semibold text-gray-500 text-lg">No items yet</p>
                        <p className="text-sm">Grocery items will appear here once added by the admin.</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 gap-3">
                        <span className="text-5xl">🔍</span>
                        <p className="font-semibold text-gray-500">No items found</p>
                        <p className="text-sm">Try a different category or search term.</p>
                        <button
                            onClick={() => { setActive("All"); setSearch(""); }}
                            className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold cursor-pointer hover:bg-emerald-700 transition-colors"
                        >
                            Show all items
                        </button>
                    </div>
                ) : (
                    <motion.div
                        layout
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                    >
                        <AnimatePresence>
                            {filtered.map((item) => (
                                <GroceryItemCard key={item._id} item={item} />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
