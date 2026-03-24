"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShieldCheck, Eye, EyeOff, Lock, Mail, User,
    Key, Loader2, CheckCircle, XCircle, AlertTriangle,
} from "lucide-react";

function SetupForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const setupKey = searchParams.get("key") ?? "";

    const [keyValid, setKeyValid] = useState<boolean | null>(null);
    const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
    const [showPass, setShowPass] = useState(false);
    const [showConf, setShowConf] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    // Client-side: if no key provided, don't even render the form
    useEffect(() => {
        setKeyValid(!!setupKey);
    }, [setupKey]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (form.password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/setup/superadmin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    setupKey,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setDone(true);
            setTimeout(() => router.push("/login"), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    // ── Invalid / missing key ────────────────────────────────────────────────
    if (keyValid === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="text-center p-10 rounded-2xl bg-[#0d1420] border border-red-500/20 max-w-sm">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-lg font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-sm text-slate-400">No valid setup key provided in the URL.</p>
                    <p className="text-xs text-slate-600 mt-3 font-mono">?key=YOUR_SETUP_KEY</p>
                </motion.div>
            </div>
        );
    }

    // ── Success ──────────────────────────────────────────────────────────────
    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="text-center p-10 rounded-2xl bg-[#0d1420] border border-emerald-500/20 max-w-sm">
                    <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
                    <h1 className="text-lg font-bold text-white mb-2">Super Admin Created!</h1>
                    <p className="text-sm text-slate-400">Redirecting to login in 3 seconds…</p>
                </motion.div>
            </div>
        );
    }

    // ── Registration form ────────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#080c14] relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md mx-4"
            >
                {/* Card */}
                <div className="bg-[#0d1420]/90 backdrop-blur-xl border border-violet-500/20 rounded-3xl p-8 shadow-2xl shadow-violet-900/30">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-600/30">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight">Super Admin Setup</h1>
                        <p className="text-sm text-slate-400 mt-1">One-time master account creation</p>
                        <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full">
                            <Key className="w-3 h-3 text-violet-400" />
                            <span className="text-[10px] text-violet-300 font-mono">Key: {setupKey}</span>
                        </div>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-2 mb-4 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-300 text-sm">
                                <XCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text" required placeholder="Super Admin"
                                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/[0.04] transition-all"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email" required placeholder="superadmin@snapkart.com"
                                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/[0.04] transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type={showPass ? "text" : "password"} required placeholder="Min 8 characters"
                                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/[0.04] transition-all"
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type={showConf ? "text" : "password"} required placeholder="Repeat password"
                                    value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/[0.04] transition-all"
                                />
                                <button type="button" onClick={() => setShowConf(!showConf)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                    {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {form.confirmPassword && form.password !== form.confirmPassword && (
                                <p className="text-[10px] text-red-400 mt-1">Passwords don't match</p>
                            )}
                        </div>

                        <button
                            type="submit" disabled={loading || !form.name || !form.email || !form.password || form.password !== form.confirmPassword}
                            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-900/40"
                        >
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account…</> : <><ShieldCheck className="w-4 h-4" />Create Super Admin</>}
                        </button>
                    </form>

                    <p className="text-center text-xs text-slate-600 mt-6">
                        ⚠️ This page will return 409 once a Super Admin exists.
                        <br />Keep this URL private — it&apos;s your master key.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

export default function SuperAdminSetupPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
        }>
            <SetupForm />
        </Suspense>
    );
}
