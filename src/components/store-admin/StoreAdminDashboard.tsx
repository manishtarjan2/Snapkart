"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
    Package, Store, ClipboardList, TrendingUp, AlertTriangle,
    LogOut, RefreshCw, CheckCircle, XCircle, Search, ChevronRight,
    ShieldAlert, BarChart2, ShoppingCart, ToggleLeft, ToggleRight,
    PlusCircle, Minus, Plus, Users, Eye, EyeOff, Trash2, KeyRound,
    Loader2, X, ShieldCheck
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface InventoryItem {
    _id: string;
    store_id: string;
    product_id: { _id: string; name: string; category: string; image?: string; price: number } | string;
    stock: number;
    priceOverride?: number;
    lowStockThreshold: number;
    updatedAt: string;
}

interface StoreOrder {
    _id: string;
    userId: { name: string; email: string } | string;
    items: { name: string; quantity: number; price: number }[];
    totalAmount: number;
    orderStatus: string;
    type: string;
    paymentMethod: string;
    createdAt: string;
}

interface SalesData {
    todayRevenue: number;
    todayOrders: number;
    weekRevenue: number;
    weekOrders: number;
    topProduct: string;
    selfCheckoutCount: number;
}

interface SelfCheckoutLog {
    _id: string;
    userId: { name: string } | string;
    totalAmount: number;
    refundReason?: string;
    createdAt: string;
    items: { name: string; quantity: number }[];
}

interface StaffMember {
    _id: string;
    name: string;
    email: string;
    role: string;
    isBlocked: boolean;
    createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
    productAdmin: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    posAdmin: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    employee: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

const NAV = [
    { id: "overview", label: "Overview", icon: BarChart2 },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "staff", label: "Staff Management", icon: Users },
    { id: "selfcheckout", label: "Self-Checkout Logs", icon: ShieldAlert },
];

const STATUS_COLORS: Record<string, string> = {
    placed: "bg-blue-500/20 text-blue-300",
    confirmed: "bg-violet-500/20 text-violet-300",
    outForDelivery: "bg-amber-500/20 text-amber-300",
    delivered: "bg-emerald-500/20 text-emerald-300",
    cancelled: "bg-red-500/20 text-red-300",
};

export default function StoreAdminDashboard() {
    const { data: session } = useSession();
    const [active, setActive] = useState("overview");
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [orders, setOrders] = useState<StoreOrder[]>([]);
    const [sales, setSales] = useState<SalesData | null>(null);
    const [logs, setLogs] = useState<SelfCheckoutLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearch] = useState("");
    const [notification, setNotification] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
    const [adjustId, setAdjustId] = useState<string | null>(null);
    const [adjustDelta, setAdjustDelta] = useState(0);

    // Staff management state
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [staffForm, setStaffForm] = useState({ name: "", email: "", password: "", role: "posAdmin" });
    const [showStaffPass, setShowStaffPass] = useState(false);
    const [creatingStaff, setCreatingStaff] = useState(false);
    const [resetStaffTarget, setResetStaffTarget] = useState<StaffMember | null>(null);
    const [newStaffPass, setNewStaffPass] = useState("");
    const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);

    const notify = (msg: string, type: "ok" | "err" = "ok") => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3500);
    };

    const loadInventory = useCallback(async () => {
        const res = await fetch("/api/store-admin/inventory");
        const data = await res.json();
        setInventory(Array.isArray(data) ? data : []);
    }, []);

    const loadOrders = useCallback(async () => {
        const res = await fetch("/api/store-admin/orders");
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
    }, []);

    const loadSales = useCallback(async () => {
        const res = await fetch("/api/store-admin/sales");
        const data = await res.json();
        setSales(data);
    }, []);

    const loadLogs = useCallback(async () => {
        const res = await fetch("/api/store-admin/self-checkout-logs");
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        try { await Promise.all([loadInventory(), loadOrders(), loadSales(), loadLogs()]); }
        finally { setLoading(false); }
    }, [loadInventory, loadOrders, loadSales, loadLogs]);

    const loadStaff = useCallback(async () => {
        const res = await fetch("/api/store-admin/staff");
        if (res.ok) { const data = await res.json(); setStaff(Array.isArray(data) ? data : []); }
    }, []);

    useEffect(() => { refresh(); loadStaff(); }, [refresh, loadStaff]);

    // ── Adjust stock ─────────────────────────────────────────────────────────────
    const adjustStock = async (id: string, delta: number) => {
        const item = inventory.find((i) => i._id === id);
        if (!item) return;
        const newStock = Math.max(0, item.stock + delta);
        const res = await fetch("/api/store-admin/inventory", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inventoryId: id, stock: newStock }),
        });
        if (!res.ok) { notify("Failed to update stock", "err"); return; }
        notify("Stock updated ✓");
        setInventory((prev) => prev.map((i) => i._id === id ? { ...i, stock: newStock } : i));
        setAdjustId(null); setAdjustDelta(0);
    };

    // ── Create staff ──────────────────────────────────────────────────────────────
    const handleCreateStaff = async (e: React.FormEvent) => {
        e.preventDefault(); setCreatingStaff(true);
        try {
            const res = await fetch("/api/store-admin/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(staffForm) });
            const data = await res.json();
            if (!res.ok) { notify(data.message, "err"); return; }
            notify(`${staffForm.role} account created ✓`);
            setStaffForm({ name: "", email: "", password: "", role: "posAdmin" });
            loadStaff();
        } catch { notify("Server error", "err"); }
        finally { setCreatingStaff(false); }
    };
    const toggleStaffBlock = async (m: StaffMember) => {
        const res = await fetch("/api/store-admin/staff", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m._id, isBlocked: !m.isBlocked }) });
        if (!res.ok) { notify("Failed", "err"); return; }
        notify(`${m.isBlocked ? "Unblocked" : "Blocked"} ✓`); loadStaff();
    };
    const handleStaffPassReset = async () => {
        if (!resetStaffTarget || newStaffPass.length < 8) { notify("Min 8 characters", "err"); return; }
        const res = await fetch("/api/store-admin/staff", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: resetStaffTarget._id, newPassword: newStaffPass }) });
        const data = await res.json();
        if (!res.ok) { notify(data.message, "err"); return; }
        notify("Password reset ✓"); setResetStaffTarget(null); setNewStaffPass("");
    };
    const handleDeleteStaff = async (m: StaffMember) => {
        if (!confirm(`Delete "${m.name}"?`)) return;
        setDeletingStaffId(m._id);
        try {
            const res = await fetch("/api/store-admin/staff", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m._id }) });
            if (!res.ok) { notify("Delete failed", "err"); return; }
            notify(`"${m.name}" removed ✓`); loadStaff();
        } catch { notify("Error", "err"); }
        finally { setDeletingStaffId(null); }
    };

    const filteredInventory = inventory.filter((item) => {
        const product = typeof item.product_id === "object" ? item.product_id : null;
        return product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? true;
    });

    const lowStockCount = inventory.filter((i) => i.stock <= i.lowStockThreshold).length;

    return (
        <div className="min-h-screen flex bg-[#0a0f1a] text-white font-sans">
            {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
            <aside className="w-60 min-h-screen bg-[#0d1420] border-r border-white/[0.06] flex flex-col fixed left-0 top-0 z-30">
                <div className="px-5 py-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                            <Store size={17} className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Snapkart</p>
                            <p className="text-[10px] text-blue-400 tracking-widest uppercase">Store Admin</p>
                        </div>
                    </div>
                </div>
                <div className="px-4 py-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04]">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-bold">
                            {session?.user?.name?.[0]?.toUpperCase() ?? "S"}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-semibold truncate">{session?.user?.name}</p>
                            <p className="text-[10px] text-slate-400">Store Manager</p>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setActive(id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active === id ? "bg-blue-500/20 text-blue-300 border border-blue-500/20" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}
                        >
                            <Icon size={15} /> {label}
                            {active === id && <ChevronRight size={13} className="ml-auto" />}
                            {id === "inventory" && lowStockCount > 0 && (
                                <span className="ml-auto bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0.5 rounded-full border border-amber-500/30">{lowStockCount}</span>
                            )}
                        </button>
                    ))}
                </nav>
                <div className="px-3 py-4 border-t border-white/[0.06] space-y-1">
                    <Link href="/admin-portal" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/[0.05] transition-colors font-medium">
                        <ShieldCheck size={15} /> Admin Portal Hub
                    </Link>
                    <button onClick={() => signOut({ callbackUrl: "/admin-login" })}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut size={15} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* ── Main ─────────────────────────────────────────────────────────────── */}
            <main className="ml-60 flex-1 min-h-screen">
                <header className="sticky top-0 z-20 bg-[#0a0f1a]/80 backdrop-blur-xl border-b border-white/[0.06] px-8 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold">{NAV.find((n) => n.id === active)?.label}</h1>
                        <p className="text-xs text-slate-500">Store Management · Snapkart</p>
                    </div>
                    <button onClick={refresh} className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08]">
                        <RefreshCw size={14} className={loading ? "animate-spin text-blue-400" : "text-slate-400"} />
                    </button>
                </header>

                {notification && (
                    <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border ${notification.type === "ok" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "bg-red-500/20 border-red-500/30 text-red-300"}`}>
                        {notification.type === "ok" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {notification.msg}
                    </div>
                )}

                <div className="p-8 space-y-6">

                    {/* ══ OVERVIEW ══════════════════════════════════════════════════════ */}
                    {active === "overview" && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    { label: "Today Revenue", value: `₹${(sales?.todayRevenue ?? 0).toLocaleString("en-IN")}`, icon: TrendingUp, color: "blue" },
                                    { label: "Today Orders", value: sales?.todayOrders ?? 0, icon: ShoppingCart, color: "cyan" },
                                    { label: "Week Revenue", value: `₹${(sales?.weekRevenue ?? 0).toLocaleString("en-IN")}`, icon: BarChart2, color: "violet" },
                                    { label: "Week Orders", value: sales?.weekOrders ?? 0, icon: ClipboardList, color: "emerald" },
                                    { label: "Low Stock Items", value: lowStockCount, icon: AlertTriangle, color: "amber" },
                                    { label: "Self-Checkout", value: sales?.selfCheckoutCount ?? 0, icon: ShieldAlert, color: "pink" },
                                ].map(({ label, value, icon: Icon, color }) => (
                                    <div key={label} className="rounded-2xl bg-[#0d1420] border border-white/[0.06] p-5">
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="text-xs text-slate-400">{label}</p>
                                            <div className={`p-2 rounded-lg bg-${color}-500/10`}>
                                                <Icon size={14} className={`text-${color}-400`} />
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold">{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Recent orders */}
                            <div className="rounded-2xl bg-[#0d1420] border border-white/[0.06] p-5">
                                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <ClipboardList size={14} className="text-blue-400" /> Recent Orders
                                </h2>
                                <div className="space-y-2">
                                    {orders.slice(0, 5).map((o) => (
                                        <div key={o._id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                                            <div>
                                                <p className="text-xs font-semibold">#{o._id.slice(-7).toUpperCase()}</p>
                                                <p className="text-[10px] text-slate-400">{o.items.length} item(s) · {o.type}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold">₹{o.totalAmount}</p>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[o.orderStatus] ?? "bg-slate-500/20 text-slate-300"}`}>{o.orderStatus}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══ INVENTORY ═════════════════════════════════════════════════════ */}
                    {active === "inventory" && (
                        <div className="rounded-2xl bg-[#0d1420] border border-white/[0.06] p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-sm font-semibold flex items-center gap-2">
                                    <Package size={14} className="text-blue-400" /> Store Inventory
                                    {lowStockCount > 0 && (
                                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full">{lowStockCount} low stock</span>
                                    )}
                                </h2>
                                <div className="relative">
                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input type="text" placeholder="Search…" value={searchQuery} onChange={(e) => setSearch(e.target.value)}
                                        className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500/40 w-40" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                {filteredInventory.map((item) => {
                                    const product = typeof item.product_id === "object" ? item.product_id : null;
                                    const isLow = item.stock <= item.lowStockThreshold;
                                    const isAdjusting = adjustId === item._id;
                                    return (
                                        <div key={item._id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isLow ? "bg-amber-500/5 border-amber-500/20" : "bg-white/[0.02] border-white/[0.05]"}`}>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate">{product?.name ?? "Unknown"}</p>
                                                <p className="text-xs text-slate-400">{product?.category} · ₹{item.priceOverride ?? product?.price}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isLow && <AlertTriangle size={13} className="text-amber-400" />}
                                                <span className={`text-xs font-bold ${isLow ? "text-amber-300" : "text-white"}`}>{item.stock} units</span>
                                            </div>
                                            {isAdjusting ? (
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setAdjustDelta((d) => d - 1)} className="w-7 h-7 rounded-lg bg-red-500/20 text-red-300 flex items-center justify-center text-sm hover:bg-red-500/30">
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className={`text-sm font-bold w-8 text-center ${adjustDelta >= 0 ? "text-emerald-400" : "text-red-400"}`}>{adjustDelta >= 0 ? `+${adjustDelta}` : adjustDelta}</span>
                                                    <button onClick={() => setAdjustDelta((d) => d + 1)} className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center hover:bg-emerald-500/30">
                                                        <Plus size={12} />
                                                    </button>
                                                    <button onClick={() => adjustStock(item._id, adjustDelta)} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold transition-colors">Save</button>
                                                    <button onClick={() => { setAdjustId(null); setAdjustDelta(0); }} className="px-3 py-1 bg-white/[0.06] hover:bg-white/[0.10] rounded-lg text-xs transition-colors">Cancel</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setAdjustId(item._id); setAdjustDelta(0); }}
                                                    className="px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-300 text-xs font-medium hover:bg-blue-500/25 transition-colors">
                                                    Adjust
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                                {filteredInventory.length === 0 && (
                                    <p className="text-center text-slate-500 text-sm py-8">No inventory items found</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══ ORDERS ════════════════════════════════════════════════════════ */}
                    {active === "orders" && (
                        <div className="rounded-2xl bg-[#0d1420] border border-white/[0.06] p-6">
                            <h2 className="text-sm font-semibold mb-5 flex items-center gap-2">
                                <ClipboardList size={14} className="text-blue-400" /> All Store Orders
                                <span className="ml-1 text-[10px] bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20">{orders.length}</span>
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs text-slate-500 border-b border-white/[0.05]">
                                            <th className="text-left pb-3 font-medium">Order ID</th>
                                            <th className="text-left pb-3 font-medium">Type</th>
                                            <th className="text-left pb-3 font-medium">Items</th>
                                            <th className="text-left pb-3 font-medium">Total</th>
                                            <th className="text-left pb-3 font-medium">Payment</th>
                                            <th className="text-left pb-3 font-medium">Status</th>
                                            <th className="text-left pb-3 font-medium">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {orders.map((o) => (
                                            <tr key={o._id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-3 pr-4 font-mono text-xs text-slate-300">#{o._id.slice(-7).toUpperCase()}</td>
                                                <td className="py-3 pr-4">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${o.type === "selfCheckout" ? "bg-pink-500/15 text-pink-300" : o.type === "offline" ? "bg-orange-500/15 text-orange-300" : "bg-blue-500/15 text-blue-300"}`}>
                                                        {o.type}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-4 text-xs text-slate-400">{o.items.length} items</td>
                                                <td className="py-3 pr-4 font-semibold">₹{o.totalAmount}</td>
                                                <td className="py-3 pr-4 text-xs text-slate-400">{o.paymentMethod}</td>
                                                <td className="py-3 pr-4">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[o.orderStatus] ?? "bg-slate-500/20 text-slate-300"}`}>{o.orderStatus}</span>
                                                </td>
                                                <td className="py-3 text-xs text-slate-500">{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ══ STAFF MANAGEMENT ══════════════════════════════════════════════════ */}
                    {active === "staff" && (
                        <div className="space-y-5">
                            {resetStaffTarget && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                                    <div className="bg-[#0d1420] border border-white/[0.08] rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-sm flex items-center gap-2"><KeyRound size={14} className="text-blue-400" /> Reset Password</h3>
                                            <button onClick={() => { setResetStaffTarget(null); setNewStaffPass(""); }} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400"><X size={14} /></button>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-4">New password for <strong className="text-white">{resetStaffTarget.name}</strong></p>
                                        <input type="password" placeholder="Min 8 chars" value={newStaffPass} onChange={e => setNewStaffPass(e.target.value)}
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50 mb-4" />
                                        <div className="flex gap-3">
                                            <button onClick={() => { setResetStaffTarget(null); setNewStaffPass(""); }} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:bg-white/[0.05]">Cancel</button>
                                            <button onClick={handleStaffPassReset} disabled={newStaffPass.length < 8} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-semibold">Save</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="rounded-2xl bg-[#0d1420] border border-white/[0.06] p-6">
                                <h2 className="text-sm font-semibold mb-5 flex items-center gap-2"><PlusCircle size={14} className="text-blue-400" /> Create Staff Account</h2>
                                <form onSubmit={handleCreateStaff} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div><label className="block text-[10px] text-slate-400 mb-1.5 uppercase">Full Name</label><input type="text" placeholder="Jane Doe" required value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50" /></div>
                                    <div><label className="block text-[10px] text-slate-400 mb-1.5 uppercase">Email</label><input type="email" placeholder="jane@store.com" required value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50" /></div>
                                    <div><label className="block text-[10px] text-slate-400 mb-1.5 uppercase">Password</label>
                                        <div className="relative"><input type={showStaffPass ? "text" : "password"} placeholder="Min 8 chars" required value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50 pr-10" />
                                            <button type="button" onClick={() => setShowStaffPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{showStaffPass ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                                        </div>
                                    </div>
                                    <div><label className="block text-[10px] text-slate-400 mb-1.5 uppercase">Role</label>
                                        <select value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50">
                                            <option value="posAdmin">🏪 POS Admin</option>
                                            <option value="productAdmin">📦 Product Admin</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 lg:col-span-4 flex justify-end">
                                        <button type="submit" disabled={creatingStaff} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-sm font-semibold flex items-center gap-2">
                                            {creatingStaff ? <><Loader2 size={13} className="animate-spin" />Creating…</> : <><PlusCircle size={13} />Create Staff</>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                            <div className="rounded-2xl bg-[#0d1420] border border-white/[0.06] p-6">
                                <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Users size={14} className="text-blue-400" /> Your Store Staff <span className="ml-1 text-[10px] bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20">{staff.length}</span></h2>
                                {staff.length === 0 ? (
                                    <p className="text-center text-slate-500 text-sm py-6">No staff added yet. Create a POS Admin or Product Admin above.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead><tr className="text-xs text-slate-500 border-b border-white/[0.05]"><th className="text-left pb-3 font-medium">Name</th><th className="text-left pb-3 font-medium">Email</th><th className="text-left pb-3 font-medium">Role</th><th className="text-left pb-3 font-medium">Status</th><th className="text-right pb-3 font-medium">Actions</th></tr></thead>
                                            <tbody className="divide-y divide-white/[0.04]">
                                                {staff.map((m) => (
                                                    <tr key={m._id} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-3 pr-4 font-medium">{m.name}</td>
                                                        <td className="py-3 pr-4 text-xs text-slate-400">{m.email}</td>
                                                        <td className="py-3 pr-4"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${ROLE_COLORS[m.role] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30"}`}>{m.role}</span></td>
                                                        <td className="py-3 pr-4"><span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${m.isBlocked ? "bg-red-500/15 text-red-400 border border-red-500/20" : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"}`}><span className={`w-1.5 h-1.5 rounded-full ${m.isBlocked ? "bg-red-400" : "bg-emerald-400"}`} />{m.isBlocked ? "Blocked" : "Active"}</span></td>
                                                        <td className="py-3 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button onClick={() => toggleStaffBlock(m)} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${m.isBlocked ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"}`}>{m.isBlocked ? "Unblock" : "Block"}</button>
                                                                <button onClick={() => { setResetStaffTarget(m); setNewStaffPass(""); }} className="p-1.5 rounded-lg bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-all"><KeyRound size={12} /></button>
                                                                <button onClick={() => handleDeleteStaff(m)} disabled={deletingStaffId === m._id} className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-40">{deletingStaffId === m._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { color: "violet", icon: "🏪", label: "POS Admin", perms: ["Operates billing counter", "Creates & manages employees", "Assigns employee ID + password", "Views shift reports"] },
                                    { color: "emerald", icon: "📦", label: "Product Admin", perms: ["Adds & edits products", "Uploads product images", "Sets discounts & categories", "Manages stock quantities"] },
                                ].map(({ color, icon, label, perms }) => (
                                    <div key={label} className={`p-4 rounded-xl bg-${color}-500/[0.05] border border-${color}-500/20`}>
                                        <p className={`font-semibold text-sm text-${color}-300 mb-2`}>{icon} {label}</p>
                                        <ul className={`space-y-0.5 text-xs text-${color}-400/70 list-disc list-inside`}>{perms.map(p => <li key={p}>{p}</li>)}</ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ══ SELF-CHECKOUT LOGS ════════════════════════════════════════════ */}
                    {active === "selfcheckout" && (
                        <div className="rounded-2xl bg-[#0d1420] border border-white/[0.06] p-6">
                            <h2 className="text-sm font-semibold mb-5 flex items-center gap-2">
                                <ShieldAlert size={14} className="text-pink-400" /> Self-Checkout Audit Log
                            </h2>
                            <div className="space-y-3">
                                {logs.map((log) => {
                                    const isFlagged = !!log.refundReason;
                                    return (
                                        <div key={log._id} className={`p-4 rounded-xl border ${isFlagged ? "bg-red-500/5 border-red-500/25" : "bg-white/[0.02] border-white/[0.05]"}`}>
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="text-xs font-semibold flex items-center gap-2">
                                                        #{log._id.slice(-7).toUpperCase()}
                                                        {isFlagged && (
                                                            <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <AlertTriangle size={9} /> Flagged
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        {typeof log.userId === "object" ? log.userId.name : "Customer"} ·{" "}
                                                        {new Date(log.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                </div>
                                                <p className="text-sm font-bold">₹{log.totalAmount}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {log.items.map((it, idx) => (
                                                    <span key={idx} className="text-[10px] bg-white/[0.05] text-slate-300 px-2 py-0.5 rounded-full">{it.name} ×{it.quantity}</span>
                                                ))}
                                            </div>
                                            {isFlagged && (
                                                <p className="mt-2 text-[10px] text-red-300 bg-red-500/10 px-3 py-1.5 rounded-lg">{log.refundReason}</p>
                                            )}
                                        </div>
                                    );
                                })}
                                {logs.length === 0 && <p className="text-center text-slate-500 text-sm py-8">No self-checkout logs yet</p>}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
