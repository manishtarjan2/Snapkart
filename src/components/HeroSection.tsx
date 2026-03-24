"use client";

import React from "react";
import { motion } from "framer-motion";
import { Search, Zap, ShieldCheck } from "lucide-react";

export default function HeroSection() {
    const handleSearch = (value: string) => {
        window.dispatchEvent(new CustomEvent("snapkart:search", { detail: value }));
    };

    return (
        <section className="relative overflow-hidden mx-4 my-6 rounded-3xl">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600" />
            <div className="absolute -top-10 -right-10 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-16 -left-10 w-72 h-72 bg-black/10 rounded-full blur-3xl" />
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                    backgroundSize: "24px 24px",
                }}
            />

            <div className="relative px-6 py-10 md:py-14 max-w-2xl">
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur border border-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
                >
                    <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                    10-minute delivery
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-3xl md:text-5xl font-black text-white leading-tight mb-3"
                >
                    Fresh Groceries,
                    <br />
                    <span className="text-yellow-300">Delivered Fast</span> 🛵
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-white/80 text-base md:text-lg mb-7"
                >
                    Order fresh vegetables, fruits &amp; daily essentials in minutes.
                </motion.p>

                {/* Live search bar */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-xl shadow-black/20 max-w-sm"
                >
                    <Search className="w-5 h-5 text-gray-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search groceries..."
                        onChange={(e) => handleSearch(e.target.value)}
                        className="flex-1 outline-none text-gray-700 bg-transparent text-sm placeholder:text-gray-400"
                    />
                </motion.div>

                {/* Trust badges */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.55 }}
                    className="flex flex-wrap items-center gap-4 mt-5"
                >
                    {["100% Fresh", "Free Delivery", "Secure Checkout"].map((t) => (
                        <div key={t} className="flex items-center gap-1 text-white/70 text-xs font-medium">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                            {t}
                        </div>
                    ))}
                </motion.div>
            </div>

            <div className="absolute right-4 bottom-4 text-8xl md:text-9xl opacity-10 select-none pointer-events-none">
                🛒
            </div>
        </section>
    );
}
