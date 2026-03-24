"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

const categories = [
    { label: "All", emoji: "🛒" },
    { label: "Fruits", emoji: "🍎" },
    { label: "Vegetables", emoji: "🥦" },
    { label: "Dairy", emoji: "🥛" },
    { label: "Snacks", emoji: "🍿" },
    { label: "Bakery", emoji: "🍞" },
    { label: "Beverages", emoji: "🧃" },
];

export default function CategorySlider() {
    const [active, setActive] = useState("All");

    return (
        <div className="px-4 py-4 max-w-6xl mx-auto">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
                Browse Categories
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hidden">
                {categories.map((cat, i) => (
                    <motion.button
                        key={cat.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
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
    );
}
