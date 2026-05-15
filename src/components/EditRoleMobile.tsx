"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { signIn, useSession } from "next-auth/react";
import { Bike, Loader2, Phone, Shield, ShoppingBag, UserCircle } from "lucide-react";

export default function EditRoleMobile() {
    const { data: session, status } = useSession();
    const [mobile, setMobile] = useState("");
    const [role, setRole] = useState<"user" | "deliveryBoy" | "admin">("user");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (status !== "authenticated") return;
        const sessionRole = session?.user?.role;
        if (sessionRole === "admin" || sessionRole === "deliveryBoy" || sessionRole === "user") {
            setRole(sessionRole);
        }
    }, [session, status]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await axios.post("/api/user/edit-role-mobile", { mobile, role });

            // Force session refresh: re-trigger the JWT callback so token.role
            // picks up the new value from the database.
            // signIn("credentials") would require password, so we do a full
            // page reload which causes the server-side auth() to re-read the
            // DB via the jwt callback's trigger.
            //
            // We redirect to /api/auth/session first to invalidate the client
            // session cache, then reload the home page.
            await fetch("/api/auth/session", { method: "GET" });

            window.location.href = "/";
        } catch {
            setError("Failed to save. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        {
            value: "user" as const,
            label: "Customer",
            desc: "Shop for groceries & get delivery",
            icon: ShoppingBag,
            color: "emerald",
        },
        {
            value: "deliveryBoy" as const,
            label: "Delivery Boy",
            desc: "Deliver orders & earn money",
            icon: Bike,
            color: "amber",
        },
        {
            value: "admin" as const,
            label: "Admin / Staff",
            desc: "Manage store, products & orders",
            icon: Shield,
            color: "violet",
        },
    ];

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

                    {/* Role selection cards */}
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <UserCircle className="w-4 h-4" /> Select your role
                        </p>
                        <div className="space-y-2">
                            {roles.map((r) => {
                                const selected = role === r.value;
                                const Icon = r.icon;
                                return (
                                    <button
                                        key={r.value}
                                        type="button"
                                        onClick={() => setRole(r.value)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left cursor-pointer ${
                                            selected
                                                ? `border-${r.color}-400 bg-${r.color}-50 shadow-sm`
                                                : "border-gray-100 bg-white hover:border-gray-200"
                                        }`}
                                    >
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                            selected ? `bg-${r.color}-100` : "bg-gray-50"
                                        }`}>
                                            <Icon className={`w-5 h-5 ${
                                                selected ? `text-${r.color}-600` : "text-gray-400"
                                            }`} />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold ${selected ? "text-gray-900" : "text-gray-600"}`}>
                                                {r.label}
                                            </p>
                                            <p className="text-xs text-gray-400">{r.desc}</p>
                                        </div>
                                        {selected && (
                                            <div className="ml-auto w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading || !mobile}
                        className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                            loading || !mobile
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
