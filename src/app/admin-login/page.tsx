'use client'

import { motion, AnimatePresence } from "framer-motion";
import {
    EyeIcon, EyeOff, Lock, Mail, Loader2,
    ShieldCheck, Store, Package, Truck, Users, ArrowLeft, AlertCircle
} from 'lucide-react'
import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";

const ROLE_INFO = [
    { role: "superAdmin", label: "Super Admin", icon: ShieldCheck, gradient: "from-violet-600 to-purple-700" },
    { role: "storeAdmin", label: "Store Admin", icon: Store, gradient: "from-blue-600 to-cyan-700" },
    { role: "productAdmin", label: "Product Admin", icon: Package, gradient: "from-emerald-600 to-teal-700" },
    { role: "deliveryAdmin", label: "Delivery Admin", icon: Truck, gradient: "from-orange-600 to-amber-700" },
    { role: "deliveryBoy", label: "Delivery Boy", icon: ShieldCheck, gradient: "from-cyan-600 to-sky-700" },
    { role: "posAdmin", label: "POS Admin", icon: Users, gradient: "from-pink-600 to-rose-700" },
];

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Invalid credentials. Please check your email and password.");
                setLoading(false);
            } else if (result?.ok) {
                // Fetch session to get role, then redirect to that role's dashboard
                const session = await getSession();
                const role = session?.user?.role ?? "";
                const NORMALIZED_ROLE = role === "diliveryBoy" ? "deliveryBoy" : role;
                const ROLE_REDIRECT: Record<string, string> = {
                    superAdmin: "/super-admin",
                    storeAdmin: "/store-admin",
                    productAdmin: "/product-admin",
                    deliveryAdmin: "/delivery-admin",
                    posAdmin: "/pos-admin",
                    deliveryBoy: "/",
                    admin: "/",
                };
                router.push(ROLE_REDIRECT[NORMALIZED_ROLE] ?? "/");
            }
        } catch {
            setError("Something went wrong. Please try again.");
            setLoading(false);
        }
    };

    const formValid = email !== "" && password !== "";

    return (
        <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background glow effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10">

                {/* Back to user login */}
                <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => router.push("/login")}
                    className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Back to user login
                </motion.button>

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-[#0d1420] border border-white/[0.07] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-violet-600/20 via-blue-600/15 to-transparent border-b border-white/[0.06] px-8 py-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
                                <ShieldCheck className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">Admin Portal</h1>
                                <p className="text-[11px] text-slate-500 tracking-wide">Snapkart Staff Access</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-3">
                            Restricted to authorised staff. Contact your Super Admin if you don&apos;t have credentials.
                        </p>
                    </div>

                    {/* Role pills */}
                    <div className="px-8 pt-6">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">Available roles</p>
                        <div className="flex flex-wrap gap-2">
                            {ROLE_INFO.map(({ label, icon: Icon, gradient }) => (
                                <div
                                    key={label}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r ${gradient} bg-opacity-10 border border-white/10 text-[10px] font-medium text-white/70`}
                                >
                                    <Icon className="w-3 h-3" />
                                    {label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="px-8 py-6 space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">
                                Work Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email"
                                    placeholder="admin@snapkart.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Your secure password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Error message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm"
                                >
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={!formValid || loading}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-900/30 mt-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Authenticating…
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-4 h-4" />
                                    Sign In to Admin Portal
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="px-8 pb-6 text-center">
                        <p className="text-[11px] text-slate-600">
                            Not an admin?{" "}
                            <button
                                onClick={() => router.push("/login")}
                                className="text-violet-400 hover:text-violet-300 transition-colors"
                            >
                                Go to user login
                            </button>
                        </p>
                    </div>
                </motion.div>

                {/* Security notice */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center text-[10px] text-slate-600 mt-6"
                >
                    🔒 Secured with encrypted sessions · Snapkart Admin Portal
                </motion.p>
            </div>
        </div>
    );
}
