"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    UserPlus, Eye, EyeOff, Lock, Mail, User,
    Store, Loader2, CheckCircle, XCircle, Shield, Truck, Package, ShieldCheck
} from "lucide-react";

const ROLES = [
    { value: "storeAdmin", label: "Store Admin", icon: Store, color: "blue", desc: "Manages store inventory & orders" },
    { value: "productAdmin", label: "Product Admin", icon: Package, color: "emerald", desc: "Manages global product catalogue" },
    { value: "deliveryAdmin", label: "Delivery Admin", icon: Truck, color: "orange", desc: "Manages delivery boys & logistics" },
    { value: "deliveryBoy", label: "Delivery Boy", icon: ShieldCheck, color: "cyan", desc: "Field rider for order delivery" },
];

const COLOR_MAP: Record<string, string> = {
    blue: "bg-blue-500/20 border-blue-500/40 text-blue-300",
    emerald: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
    orange: "bg-orange-500/20 border-orange-500/40 text-orange-300",
    cyan: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300",
};

interface Staff { _id: string; name: string; email: string; role: string; isBlocked: boolean; createdAt: string; }

export default function AdminRegisterPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", role: "storeAdmin", store_id: "" });
    const [showPass, setShowPass] = useState(false);
    const [showConf, setShowConf] = useState(false);
    const [loading, setLoading] = useState(false);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

    // Guard
    useEffect(() => {
        if (status === "loading") return;
        if (!session?.user || session.user.role !== "superAdmin") {
            router.replace("/login");
        }
    }, [session, status, router]);

    const fetchStaff = async () => {
        setLoadingStaff(true);
        const res = await fetch("/api/register/admin");
        setStaff(await res.json());
        setLoadingStaff(false);
    };

    useEffect(() => { if (session?.user?.role === "superAdmin") fetchStaff(); }, [session]);

    const notify = (msg: string, type: "ok" | "err" = "ok") => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.password !== form.confirmPassword) { notify("Passwords do not match.", "err"); return; }
        if (form.password.length < 8) { notify("Password must be at least 8 characters.", "err"); return; }

        setLoading(true);
        try {
            const res = await fetch("/api/register/admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    role: form.role,
                    store_id: form.store_id || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            notify(`✓ ${data.role} "${data.name}" created!`);
            setForm({ name: "", email: "", password: "", confirmPassword: "", role: "storeAdmin", store_id: "" });
            fetchStaff();
        } catch (err: unknown) {
            notify(err instanceof Error ? err.message : "Failed to create account.", "err");
        } finally {
            setLoading(false);
        }
    };

    const selectedRole = ROLES.find((r) => r.value === form.role);

    if (status === "loading" || session?.user?.role !== "superAdmin") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#080c14] text-white">
            {/* Header */}
            <header className="border-b border-white/[0.06] bg-[#0d1420]/80 backdrop-blur-xl px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold">Admin Registration</h1>
                        <p className="text-[10px] text-slate-500">Super Admin Panel · Snapkart</p>
                    </div>
                </div>
                <button onClick={() => router.push("/super-admin")}
                    className="text-xs text-slate-400 hover:text-white border border-white/[0.08] px-4 py-2 rounded-xl hover:bg-white/[0.05] transition-all">
                    ← Back to Dashboard
                </button>
            </header>

            {/* Notification */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border ${notification.type === "ok" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "bg-red-500/20 border-red-500/30 text-red-300"}`}
                    >
                        {notification.type === "ok" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {notification.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* ── Registration Form ──────────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="bg-[#0d1420] border border-white/[0.07] rounded-2xl p-8">
                        <h2 className="text-sm font-semibold mb-6 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-violet-400" /> Create Staff Account
                        </h2>

                        {/* Role selector */}
                        <div className="grid grid-cols-2 gap-2 mb-6">
                            {ROLES.map((r) => {
                                const RoleIcon = r.icon;
                                const isSelected = form.role === r.value;
                                return (
                                    <button
                                        key={r.value}
                                        type="button"
                                        onClick={() => setForm({ ...form, role: r.value })}
                                        className={`p-3 rounded-xl border text-left transition-all ${isSelected ? COLOR_MAP[r.color] + " shadow-inner" : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:border-white/[0.15] hover:text-white"}`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <RoleIcon className="w-3.5 h-3.5" />
                                            <span className="text-xs font-semibold">{r.label}</span>
                                        </div>
                                        <p className="text-[10px] opacity-70 leading-tight">{r.desc}</p>
                                    </button>
                                );
                            })}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input type="text" required placeholder={`${selectedRole?.label ?? "Admin"} Name`}
                                        value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input type="email" required placeholder="staff@snapkart.com"
                                        value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                                </div>
                            </div>

                            {/* Store ID — only relevant for store-scoped roles */}
                            {(form.role === "storeAdmin" || form.role === "deliveryAdmin" || form.role === "deliveryBoy") && (
                                <div>
                                    <label className="block text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">Store ID <span className="normal-case text-slate-600">(optional)</span></label>
                                    <div className="relative">
                                        <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input type="text" placeholder="MongoDB ObjectId of store"
                                            value={form.store_id} onChange={(e) => setForm({ ...form, store_id: e.target.value })}
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono placeholder-slate-700 focus:outline-none focus:border-violet-500/50 transition-all" />
                                    </div>
                                </div>
                            )}

                            {/* Password */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input type={showPass ? "text" : "password"} required placeholder="Min 8 chars"
                                            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-9 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                            {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">Confirm</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input type={showConf ? "text" : "password"} required placeholder="Repeat"
                                            value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                            className={`w-full bg-white/[0.04] border rounded-xl pl-10 pr-9 py-2.5 text-sm placeholder-slate-600 focus:outline-none transition-all ${form.confirmPassword && form.password !== form.confirmPassword ? "border-red-500/40 focus:border-red-500/60" : "border-white/[0.08] focus:border-violet-500/50"}`} />
                                        <button type="button" onClick={() => setShowConf(!showConf)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                            {showConf ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    {form.confirmPassword && form.password !== form.confirmPassword && (
                                        <p className="text-[10px] text-red-400 mt-1">Doesn't match</p>
                                    )}
                                </div>
                            </div>

                            <button type="submit" disabled={loading || !form.name || !form.email || !form.password || form.password !== form.confirmPassword}
                                className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-900/30">
                                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : <><UserPlus className="w-4 h-4" />Create {selectedRole?.label}</>}
                            </button>
                        </form>
                    </div>
                </motion.div>

                {/* ── Existing Staff List ────────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <div className="bg-[#0d1420] border border-white/[0.07] rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-sm font-semibold flex items-center gap-2">
                                <Shield className="w-4 h-4 text-violet-400" /> Existing Staff
                                <span className="text-[10px] bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/20">{staff.length}</span>
                            </h2>
                            <button onClick={fetchStaff} className="text-xs text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition-all">{loadingStaff ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "↻"}</button>
                        </div>

                        <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                            {staff.length === 0 && !loadingStaff && (
                                <p className="text-center text-slate-500 text-sm py-8">No staff accounts yet.<br />Create the first one →</p>
                            )}
                            {staff.map((s) => {
                                const roleData = ROLES.find((r) => r.value === s.role);
                                const RoleIcon = roleData?.icon ?? Shield;
                                const color = roleData?.color ?? "slate";
                                return (
                                    <div key={s._id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${s.isBlocked ? "bg-red-500/5 border-red-500/15 opacity-60" : "bg-white/[0.02] border-white/[0.05] hover:border-white/[0.10]"}`}>
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${color}-500/15 border border-${color}-500/20 shrink-0`}>
                                            <RoleIcon className={`w-4 h-4 text-${color}-400`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{s.name}</p>
                                            <p className="text-[10px] text-slate-400 truncate">{s.email}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${COLOR_MAP[color]}`}>{roleData?.label ?? s.role}</span>
                                            {s.isBlocked && <p className="text-[9px] text-red-400 mt-0.5">Blocked</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
