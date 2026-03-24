"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { Loader2, Phone, UserCircle } from "lucide-react";

export default function EditRoleMobile() {
    const [mobile, setMobile] = useState("");
    const [role, setRole] = useState<"user" | "deliveryBoy">("user");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await axios.post("/api/user/edit-role-mobile", { mobile, role });
            window.location.href = "/";
        } catch {
            setError("Failed to save. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-green-50 to-white px-4">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm"
            >
                <h2 className="text-2xl font-extrabold text-green-700 mb-1 text-center">
                    Complete Your Profile
                </h2>
                <p className="text-gray-500 text-sm text-center mb-6">
                    Tell us a bit more to get started 🚀
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Mobile */}
                    <div className="relative">
                        <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                            type="tel"
                            placeholder="Mobile number"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            required
                            className="w-full border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                    </div>

                    {/* Role */}
                    <div className="relative">
                        <UserCircle className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as "user" | "deliveryBoy")}
                            className="w-full border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                        >
                            <option value="user">Customer</option>
                            <option value="deliveryBoy">Delivery Boy</option>
                        </select>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading || !mobile}
                        className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${loading || !mobile
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-green-600 text-white hover:bg-green-700 shadow-md"
                            }`}
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Continue
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
