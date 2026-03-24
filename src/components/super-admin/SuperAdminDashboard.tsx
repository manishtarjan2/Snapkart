"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
    BarChart2, Store, Users, Package, Truck,
    ShieldCheck, LogOut, ChevronRight, TrendingUp,
    PlusCircle, AlertTriangle, CheckCircle, XCircle,
    Activity, Globe, DollarSign, Settings, Bell, Search,
    Eye, EyeOff, RefreshCw, UserPlus, Trash2, KeyRound, X, Loader2
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
    _id: string;
    name: string;
    email: string;
    role: string;
    store_id?: { _id: string; name?: string } | string | null;
    isBlocked: boolean;
    createdAt: string;
}

interface StoreDoc {
    _id: string;
    name: string;
    address: { city: string; state: string };
    commission: number;
    deliveryRadiusKm: number;
    isActive: boolean;
    manager_id?: string | null;
}

interface GlobalStats {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
}

interface PerBranch {
    _id: string;
    revenue: number;
    orders: number;
    store?: { name: string; address: { city: string } };
}

interface UserCount {
    _id: string;
    count: number;
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV = [
    { id: "overview", label: "Overview", icon: BarChart2 },
    { id: "admins", label: "Admin Accounts", icon: Users },
    { id: "stores", label: "Stores", icon: Store },
    { id: "products", label: "Product Admins", icon: Package },
    { id: "delivery", label: "Delivery Admins", icon: Truck },
    { id: "settings", label: "Global Settings", icon: Settings },
];

const ROLE_COLORS: Record<string, string> = {
    superAdmin: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
    storeAdmin: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    productAdmin: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    posAdmin: "bg-pink-500/20 text-pink-300 border border-pink-500/30",
    deliveryAdmin: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    deliveryBoy: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    employee: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
    user: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
    const { data: session } = useSession();
    const router = useRouter();
    const [active, setActive] = useState("overview");
    const [loading, setLoading] = useState(false);
    const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
    const [perBranch, setPerBranch] = useState<PerBranch[]>([]);
    const [userCounts, setUserCounts] = useState<UserCount[]>([]);
    const [stores, setStores] = useState<StoreDoc[]>([]);
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [notification, setNotification] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Create-admin form
    const [createForm, setCreateForm] = useState({
        name: "", email: "", password: "", role: "storeAdmin", store_id: "",
    });
    const [showPass, setShowPass] = useState(false);
    const [creating, setCreating] = useState(false);

    // Settings form
    const [settingsForm, setSettingsForm] = useState({ storeId: "", commission: "", deliveryRadiusKm: "" });

    // Reset password modal
    const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showNewPass, setShowNewPass] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const notify = (msg: string, type: "ok" | "err" = "ok") => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const loadStats = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/super-admin/stats");
            const data = await res.json();
            setGlobalStats(data.globalRevenue);
            setPerBranch(data.perBranch ?? []);
            setUserCounts(data.userCounts ?? []);
        } catch { notify("Failed to load stats", "err"); }
        finally { setLoading(false); }
    }, []);

    const loadStores = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/stores");
            const data = await res.json();
            setStores(Array.isArray(data) ? data : []);
        } catch { notify("Failed to load stores", "err"); }
    }, []);

    const loadAdmins = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/users");
            const data = await res.json();
            setAdmins(Array.isArray(data) ? data.filter(
                (u: AdminUser) => ["storeAdmin", "productAdmin", "deliveryAdmin", "posAdmin", "superAdmin"].includes(u.role)
            ) : []);
        } catch { notify("Failed to load admins", "err"); }
    }, []);

    useEffect(() => { loadStats(); loadStores(); loadAdmins(); }, [loadStats, loadStores, loadAdmins]);

    // ── Create admin ────────────────────────────────────────────────────────────
    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch("/api/super-admin/stats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "createAdmin",
                    ...createForm,
                    store_id: createForm.store_id || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) { notify(data.message, "err"); return; }
            notify(`Admin "${createForm.name}" created ✓`, "ok");
            setCreateForm({ name: "", email: "", password: "", role: "storeAdmin", store_id: "" });
            loadAdmins();
        } catch { notify("Server error", "err"); }
        finally { setCreating(false); }
    };

    // ── Block / Unblock ────────────────────────────────────────────────────────
    const toggleBlock = async (userId: string, block: boolean) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isBlocked: block }),
            });
            if (!res.ok) { notify("Failed to update", "err"); return; }
            notify(`User ${block ? "blocked" : "unblocked"} ✓`);
            loadAdmins();
        } catch { notify("Server error", "err"); }
    };

    // ── Delete admin ────────────────────────────────────────────────────────────
    const handleDelete = async (admin: AdminUser) => {
        if (!confirm(`Permanently delete "${admin.name}" (${admin.role})? This cannot be undone.`)) return;
        setDeletingId(admin._id);
        try {
            const res = await fetch(`/api/admin/users/${admin._id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) { notify(data.message, "err"); return; }
            notify(`"${admin.name}" deleted ✓`);
            loadAdmins();
        } catch { notify("Delete failed", "err"); }
        finally { setDeletingId(null); }
    };

    // ── Reset password ─────────────────────────────────────────────────────────
    const handleResetPassword = async () => {
        if (!resetTarget || !newPassword) return;
        if (newPassword.length < 8) { notify("Password must be at least 8 characters", "err"); return; }
        setResetting(true);
        try {
            const res = await fetch(`/api/admin/users/${resetTarget._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword }),
            });
            const data = await res.json();
            if (!res.ok) { notify(data.message, "err"); return; }
            notify(`Password reset for "${resetTarget.name}" ✓`);
            setResetTarget(null); setNewPassword("");
        } catch { notify("Reset failed", "err"); }
        finally { setResetting(false); }
    };

    // ── Settings ───────────────────────────────────────────────────────────────
    const handleSetting = async (action: string) => {
        try {
            const res = await fetch("/api/super-admin/stats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    storeId: settingsForm.storeId,
                    commission: Number(settingsForm.commission),
                    deliveryRadiusKm: Number(settingsForm.deliveryRadiusKm),
                }),
            });
            const data = await res.json();
            if (!res.ok) { notify(data.message, "err"); return; }
            notify("Updated ✓");
            loadStores();
        } catch { notify("Server error", "err"); }
    };

    const filteredAdmins = admins.filter(
        (a) =>
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalRevenue = globalStats?.totalRevenue ?? 0;
    const totalOrders = globalStats?.totalOrders ?? 0;
    const avgOrder = globalStats?.avgOrderValue ?? 0;

    return (
        <div className="min-h-screen flex bg-[#0a0a0f] text-white font-sans">

            {/* ── Reset Password Modal ──────────────────────────────────────────────── */}
            {resetTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#111118] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-sm flex items-center gap-2"><KeyRound size={15} className="text-violet-400" /> Reset Password</h3>
                            <button onClick={() => { setResetTarget(null); setNewPassword(""); }} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400"><X size={14} /></button>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">Setting new password for <strong className="text-white">{resetTarget.name}</strong> ({resetTarget.role})</p>
                        <div className="relative mb-4">
                            <input
                                type={showNewPass ? "text" : "password"}
                                placeholder="New password (min 8 chars)"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 pr-10"
                            />
                            <button type="button" onClick={() => setShowNewPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                                {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setResetTarget(null); setNewPassword(""); }} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:bg-white/[0.05] transition-colors">Cancel</button>
                            <button onClick={handleResetPassword} disabled={resetting || !newPassword}
                                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                                {resetting ? <><Loader2 size={13} className="animate-spin" />Saving…</> : <><KeyRound size={13} />Reset</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
            <aside className="w-64 min-h-screen bg-[#111118] border-r border-white/[0.06] flex flex-col fixed left-0 top-0 z-30">
                {/* Logo */}
                <div className="px-6 py-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <ShieldCheck size={18} className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-sm tracking-wide text-white">Snapkart</p>
                            <p className="text-[10px] text-violet-400 tracking-widest uppercase">Super Admin</p>
                        </div>
                    </div>
                </div>

                {/* User */}
                <div className="px-4 py-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.04]">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xs font-bold">
                            {session?.user?.name?.[0]?.toUpperCase() ?? "S"}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-semibold truncate">{session?.user?.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{session?.user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActive(id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${active === id
                                ? "bg-violet-500/20 text-violet-300 border border-violet-500/20"
                                : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                                }`}
                        >
                            <Icon size={16} />
                            {label}
                            {active === id && <ChevronRight size={14} className="ml-auto" />}
                        </button>
                    ))}
                </nav>

                {/* Register + Hub + Logout */}
                <div className="px-3 py-4 border-t border-white/[0.06] space-y-1.5">
                    <button
                        onClick={() => router.push("/register/admin")}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-violet-400 hover:bg-violet-500/10 transition-colors font-medium"
                    >
                        <UserPlus size={16} /> Register Staff
                    </button>
                    <button
                        onClick={() => router.push("/admin-portal")}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/[0.05] transition-colors font-medium"
                    >
                        <ShieldCheck size={16} /> Admin Portal Hub
                    </button>
                    <button
                        onClick={() => signOut({ callbackUrl: "/admin-login" })}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* ── Main ─────────────────────────────────────────────────────────────── */}
            <main className="ml-64 flex-1 min-h-screen">

                {/* Top bar */}
                <header className="sticky top-0 z-20 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06] px-8 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold capitalize">
                            {NAV.find((n) => n.id === active)?.label ?? "Dashboard"}
                        </h1>
                        <p className="text-xs text-slate-500">Snapkart Control Center · Super Admin</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { loadStats(); loadStores(); loadAdmins(); }}
                            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                        >
                            <RefreshCw size={15} className={loading ? "animate-spin text-violet-400" : "text-slate-400"} />
                        </button>
                        <div className="relative">
                            <Bell size={15} className="text-slate-400" />
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-violet-500" />
                        </div>
                    </div>
                </header>

                {/* Notification */}
                {notification && (
                    <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border ${notification.type === "ok"
                        ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                        : "bg-red-500/20 border-red-500/30 text-red-300"
                        }`}>
                        {notification.type === "ok" ? <CheckCircle size={15} /> : <XCircle size={15} />}
                        {notification.msg}
                    </div>
                )}

                <div className="p-8 space-y-8">

                    {/* ════════════════════════════════ OVERVIEW ══════════════════════════ */}
                    {active === "overview" && (
                        <div className="space-y-6">
                            {/* KPI cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}`, icon: DollarSign, color: "violet" },
                                    { label: "Total Orders", value: totalOrders.toLocaleString(), icon: Activity, color: "blue" },
                                    { label: "Avg Order Value", value: `₹${avgOrder.toFixed(0)}`, icon: TrendingUp, color: "emerald" },
                                ].map(({ label, value, icon: Icon, color }) => (
                                    <div key={label} className="rounded-2xl bg-[#111118] border border-white/[0.06] p-6">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
                                                <p className="text-3xl font-bold mt-2 tracking-tight">{value}</p>
                                            </div>
                                            <div className={`p-3 rounded-xl bg-${color}-500/10`}>
                                                <Icon size={20} className={`text-${color}-400`} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* User distribution */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="rounded-2xl bg-[#111118] border border-white/[0.06] p-6">
                                    <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                        <Users size={15} className="text-violet-400" /> Role Distribution
                                    </h2>
                                    <div className="space-y-3">
                                        {userCounts.map((u) => (
                                            <div key={u._id} className="flex items-center justify-between">
                                                <span className={`px-2 py-0.5 text-xs rounded-full ${ROLE_COLORS[u._id] ?? ROLE_COLORS.user}`}>
                                                    {u._id}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 bg-white/[0.04] rounded-full w-32 overflow-hidden">
                                                        <div
                                                            className="h-full bg-violet-500 rounded-full"
                                                            style={{ width: `${Math.min(100, (u.count / (userCounts.reduce((s, x) => s + x.count, 0) || 1)) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-slate-300 w-6 text-right">{u.count}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Branch performance */}
                                <div className="rounded-2xl bg-[#111118] border border-white/[0.06] p-6">
                                    <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                        <Globe size={15} className="text-blue-400" /> Branch Revenue
                                    </h2>
                                    <div className="space-y-3">
                                        {perBranch.length === 0 && (
                                            <p className="text-xs text-slate-500">No branch sales yet</p>
                                        )}
                                        {perBranch.slice(0, 5).map((b) => (
                                            <div key={b._id} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-300 truncate max-w-[140px]">
                                                    {b.store?.name ?? "Unknown Store"}
                                                </span>
                                                <div className="text-right">
                                                    <p className="text-emerald-400 font-semibold">₹{b.revenue.toLocaleString("en-IN")}</p>
                                                    <p className="text-xs text-slate-500">{b.orders} orders</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Stores quick status */}
                            <div className="rounded-2xl bg-[#111118] border border-white/[0.06] p-6">
                                <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                    <Store size={15} className="text-blue-400" /> Store Branches
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {stores.map((s) => (
                                        <div key={s._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                            <div className={`w-2.5 h-2.5 rounded-full ${s.isActive ? "bg-emerald-400" : "bg-red-400"}`} />
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-medium truncate">{s.name}</p>
                                                <p className="text-[10px] text-slate-500">{s.address?.city} · {s.commission}% commission</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════ ADMINS ════════════════════════════ */}
                    {active === "admins" && (
                        <div className="space-y-6">
                            {/* Create form */}
                            <div className="rounded-2xl bg-[#111118] border border-white/[0.06] p-6">
                                <h2 className="text-sm font-semibold mb-5 flex items-center gap-2">
                                    <PlusCircle size={15} className="text-violet-400" /> Create New Admin Account
                                </h2>
                                <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        { key: "name", label: "Full Name", type: "text", ph: "Jane Doe" },
                                        { key: "email", label: "Email", type: "email", ph: "jane@store.com" },
                                    ].map(({ key, label, type, ph }) => (
                                        <div key={key}>
                                            <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
                                            <input
                                                type={type}
                                                placeholder={ph}
                                                value={createForm[key as keyof typeof createForm]}
                                                onChange={(e) => setCreateForm({ ...createForm, [key]: e.target.value })}
                                                required
                                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
                                            />
                                        </div>
                                    ))}

                                    {/* Password */}
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1.5">Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPass ? "text" : "password"}
                                                placeholder="Min 8 chars"
                                                value={createForm.password}
                                                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                                required
                                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all pr-10"
                                            />
                                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                                                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Role */}
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1.5">Admin Role</label>
                                        <select
                                            value={createForm.role}
                                            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all"
                                        >
                                            <option value="storeAdmin">🏪 Store Admin</option>
                                            <option value="productAdmin">📦 Product Admin</option>
                                            <option value="deliveryAdmin">🚚 Delivery Admin</option>
                                            <option value="posAdmin">🏷️ POS Admin</option>
                                        </select>
                                    </div>

                                    {/* Store (for storeAdmin and posAdmin) */}
                                    {["storeAdmin", "posAdmin"].includes(createForm.role) && (
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5">Assign Store</label>
                                            <select
                                                value={createForm.store_id}
                                                onChange={(e) => setCreateForm({ ...createForm, store_id: e.target.value })}
                                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all"
                                            >
                                                <option value="">— select store —</option>
                                                {stores.map((s) => (
                                                    <option key={s._id} value={s._id}>{s.name} ({s.address?.city})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="md:col-span-2 lg:col-span-3 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={creating}
                                            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                                        >
                                            {creating ? <RefreshCw size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                                            {creating ? "Creating…" : "Create Admin"}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Admin list */}
                            <div className="rounded-2xl bg-[#111118] border border-white/[0.06] p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-sm font-semibold flex items-center gap-2">
                                        <Users size={15} className="text-violet-400" /> All Admin Accounts
                                        <span className="ml-2 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 text-[10px]">{filteredAdmins.length}</span>
                                    </h2>
                                    <div className="relative">
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Search admins…"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-8 pr-4 py-2 text-xs placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-all w-48"
                                        />
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-xs text-slate-500 border-b border-white/[0.05]">
                                                <th className="text-left pb-3 font-medium">Name</th>
                                                <th className="text-left pb-3 font-medium">Email</th>
                                                <th className="text-left pb-3 font-medium">Role</th>
                                                <th className="text-left pb-3 font-medium">Store</th>
                                                <th className="text-left pb-3 font-medium">Status</th>
                                                <th className="text-right pb-3 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04]">
                                            {filteredAdmins.length === 0 && (
                                                <tr><td colSpan={6} className="py-8 text-center text-slate-500 text-xs">No admin accounts found</td></tr>
                                            )}
                                            {filteredAdmins.map((admin) => (
                                                <tr key={admin._id} className="group hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-3 pr-4 font-medium text-white/90">{admin.name}</td>
                                                    <td className="py-3 pr-4 text-slate-400 text-xs">{admin.email}</td>
                                                    <td className="py-3 pr-4">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ROLE_COLORS[admin.role] ?? ROLE_COLORS.user}`}>
                                                            {admin.role}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 pr-4 text-xs text-slate-400">
                                                        {typeof admin.store_id === "object" && admin.store_id?.name
                                                            ? admin.store_id.name : admin.store_id ? "Assigned" : "—"}
                                                    </td>
                                                    <td className="py-3 pr-4">
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${admin.isBlocked
                                                            ? "bg-red-500/15 text-red-400 border border-red-500/20"
                                                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                                            }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${admin.isBlocked ? "bg-red-400" : "bg-emerald-400"}`} />
                                                            {admin.isBlocked ? "Blocked" : "Active"}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {/* Block / Unblock */}
                                                            <button
                                                                onClick={() => toggleBlock(admin._id, !admin.isBlocked)}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${admin.isBlocked
                                                                    ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                                                                    : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
                                                                    }`}
                                                            >
                                                                {admin.isBlocked ? "Unblock" : "Block"}
                                                            </button>
                                                            {/* Reset password */}
                                                            <button
                                                                onClick={() => { setResetTarget(admin); setNewPassword(""); }}
                                                                title="Reset Password"
                                                                className="p-1.5 rounded-lg bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-all"
                                                            >
                                                                <KeyRound size={12} />
                                                            </button>
                                                            {/* Delete */}
                                                            <button
                                                                onClick={() => handleDelete(admin)}
                                                                disabled={deletingId === admin._id}
                                                                title="Delete Account"
                                                                className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-40"
                                                            >
                                                                {deletingId === admin._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════ STORES ════════════════════════════ */}
                    {active === "stores" && (
                        <div className="rounded-2xl bg-[#111118] border border-white/[0.06] p-6">
                            <h2 className="text-sm font-semibold mb-5 flex items-center gap-2">
                                <Store size={15} className="text-blue-400" /> Store Branches
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stores.map((s) => (
                                    <div key={s._id}
                                        className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-blue-500/30 transition-all group"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="font-semibold text-sm">{s.name}</p>
                                                <p className="text-xs text-slate-400">{s.address?.city}, {s.address?.state}</p>
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                                                {s.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                        <div className="space-y-2 text-xs text-slate-400">
                                            <div className="flex justify-between">
                                                <span>Commission</span>
                                                <span className="text-violet-300 font-semibold">{s.commission}%</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Delivery Radius</span>
                                                <span className="text-blue-300 font-semibold">{s.deliveryRadiusKm} km</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Manager</span>
                                                <span className={s.manager_id ? "text-emerald-300" : "text-red-400"}>
                                                    {s.manager_id ? "Assigned" : "No Manager"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-white/[0.05]">
                                            <p className="text-[9px] text-slate-600 font-mono">{s._id}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════ PRODUCTS ══════════════════════════ */}
                    {active === "products" && (
                        <div className="space-y-4">
                            <div className="rounded-2xl bg-[#111118] border border-white/[0.06] p-6">
                                <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                    <Package size={15} className="text-emerald-400" /> Product Admin Management
                                </h2>
                                <div className="space-y-2 text-xs text-slate-400">
                                    {admins.filter((a) => a.role === "productAdmin").length === 0 && (
                                        <div className="flex items-center gap-2 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300">
                                            <AlertTriangle size={14} />
                                            No product admins created yet. Use the &quot;Admin Accounts&quot; tab to add one.
                                        </div>
                                    )}
                                    {admins.filter((a) => a.role === "productAdmin").map((a) => (
                                        <div key={a._id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                            <div>
                                                <p className="text-sm font-medium text-white">{a.name}</p>
                                                <p className="text-xs text-slate-400">{a.email}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${a.isBlocked ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                                                    {a.isBlocked ? "Blocked" : "Active"}
                                                </span>
                                                <button onClick={() => toggleBlock(a._id, !a.isBlocked)}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${a.isBlocked ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"}`}>
                                                    {a.isBlocked ? "Unblock" : "Block"}
                                                </button>
                                                <button onClick={() => { setResetTarget(a); setNewPassword(""); }} title="Reset Password"
                                                    className="p-1.5 rounded-lg bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-all">
                                                    <KeyRound size={12} />
                                                </button>
                                                <button onClick={() => handleDelete(a)} disabled={deletingId === a._id} title="Delete"
                                                    className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-40">
                                                    {deletingId === a._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 text-xs text-emerald-300">
                                    <p className="font-semibold mb-1">Product Admin Capabilities</p>
                                    <ul className="space-y-0.5 text-emerald-400/80 list-disc list-inside">
                                        <li>Add / edit / deactivate products globally</li>
                                        <li>Upload product images via Cloudinary</li>
                                        <li>Set bulk discounts per category</li>
                                        <li>Manage categories and subcategories</li>
                                        <li>Update barcode, brand, unit metadata</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════ DELIVERY ══════════════════════════ */}
                    {active === "delivery" && (
                        <div className="space-y-4">
                            <div className="rounded-2xl bg-[#111118] border border-white/[0.06] p-6">
                                <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                    <Truck size={15} className="text-orange-400" /> Delivery Admin Management
                                </h2>
                                {admins.filter((a) => a.role === "deliveryAdmin").length === 0 && (
                                    <div className="flex items-center gap-2 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300">
                                        <AlertTriangle size={14} />
                                        No delivery admins created yet. Use the &quot;Admin Accounts&quot; tab to add one.
                                    </div>
                                )}
                                {admins.filter((a) => a.role === "deliveryAdmin").map((a) => (
                                    <div key={a._id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] mb-2">
                                        <div>
                                            <p className="text-sm font-medium text-white">{a.name}</p>
                                            <p className="text-xs text-slate-400">{a.email}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${a.isBlocked ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                                                {a.isBlocked ? "Blocked" : "Active"}
                                            </span>
                                            <button onClick={() => toggleBlock(a._id, !a.isBlocked)}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${a.isBlocked ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"}`}>
                                                {a.isBlocked ? "Unblock" : "Block"}
                                            </button>
                                            <button onClick={() => { setResetTarget(a); setNewPassword(""); }} title="Reset Password"
                                                className="p-1.5 rounded-lg bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-all">
                                                <KeyRound size={12} />
                                            </button>
                                            <button onClick={() => handleDelete(a)} disabled={deletingId === a._id} title="Delete"
                                                className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-40">
                                                {deletingId === a._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <div className="mt-4 p-4 rounded-xl bg-orange-500/[0.06] border border-orange-500/20 text-xs text-orange-300">
                                    <p className="font-semibold mb-1">Delivery Admin Capabilities</p>
                                    <ul className="space-y-0.5 text-orange-400/80 list-disc list-inside">
                                        <li>Add / suspend delivery boys</li>
                                        <li>Assign orders to riders</li>
                                        <li>Track live GPS positions</li>
                                        <li>View delivery performance metrics</li>
                                        <li>Flag suspicious deliveries</li>
                                        <li>Set delivery zones</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════ SETTINGS ══════════════════════════ */}
                    {active === "settings" && (
                        <div className="space-y-6">
                            <div className="rounded-2xl bg-[#111118] border border-white/[0.06] p-6">
                                <h2 className="text-sm font-semibold mb-5 flex items-center gap-2">
                                    <Settings size={15} className="text-violet-400" /> Global Pricing Controls
                                </h2>
                                <div className="space-y-4 max-w-lg">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1.5">Select Store</label>
                                        <select
                                            value={settingsForm.storeId}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, storeId: e.target.value })}
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all"
                                        >
                                            <option value="">— select store —</option>
                                            {stores.map((s) => (
                                                <option key={s._id} value={s._id}>{s.name} ({s.address?.city})</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Commission */}
                                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] space-y-3">
                                        <p className="text-xs font-semibold text-violet-300">💰 Commission Rate</p>
                                        <div className="flex gap-3">
                                            <input
                                                type="number"
                                                min={0} max={100}
                                                placeholder="e.g. 5"
                                                value={settingsForm.commission}
                                                onChange={(e) => setSettingsForm({ ...settingsForm, commission: e.target.value })}
                                                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-all"
                                            />
                                            <span className="self-center text-sm text-slate-400">%</span>
                                            <button
                                                onClick={() => handleSetting("updateCommission")}
                                                disabled={!settingsForm.storeId}
                                                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-xl text-xs font-semibold transition-colors"
                                            >
                                                Update
                                            </button>
                                        </div>
                                    </div>

                                    {/* Delivery zone */}
                                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] space-y-3">
                                        <p className="text-xs font-semibold text-blue-300">📍 Delivery Zone Radius</p>
                                        <div className="flex gap-3">
                                            <input
                                                type="number"
                                                min={1}
                                                placeholder="e.g. 10"
                                                value={settingsForm.deliveryRadiusKm}
                                                onChange={(e) => setSettingsForm({ ...settingsForm, deliveryRadiusKm: e.target.value })}
                                                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-all"
                                            />
                                            <span className="self-center text-sm text-slate-400">km</span>
                                            <button
                                                onClick={() => handleSetting("updateDeliveryZone")}
                                                disabled={!settingsForm.storeId}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl text-xs font-semibold transition-colors"
                                            >
                                                Update
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RBAC Summary */}
                            <div className="rounded-2xl bg-[#111118] border border-white/[0.06] p-6">
                                <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                    <ShieldCheck size={15} className="text-violet-400" /> Role Permission Map
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                    {[
                                        { role: "superAdmin", color: "violet", perms: ["All stores", "All admins", "Global revenue", "Commission control", "Delivery zones"] },
                                        { role: "storeAdmin", color: "blue", perms: ["Own store inventory", "Store orders", "Self-checkout logs", "Store analytics"] },
                                        { role: "productAdmin", color: "emerald", perms: ["Add/edit products", "Manage categories", "Set discounts", "Upload images"] },
                                        { role: "deliveryAdmin", color: "orange", perms: ["Assign orders", "Track riders", "Manage delivery boys", "Performance reports"] },
                                        { role: "deliveryBoy", color: "yellow", perms: ["View assigned orders", "Update GPS", "Mark delivered", "OTP verify"] },
                                        { role: "user", color: "slate", perms: ["Place orders", "Self-checkout", "Track delivery", "Request refunds"] },
                                    ].map(({ role, color, perms }) => (
                                        <div key={role} className={`p-4 rounded-xl bg-${color}-500/[0.05] border border-${color}-500/20`}>
                                            <p className={`font-semibold text-${color}-300 mb-2`}>{role}</p>
                                            <ul className={`space-y-0.5 text-${color}-400/70 list-disc list-inside`}>
                                                {perms.map((p) => <li key={p}>{p}</li>)}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
